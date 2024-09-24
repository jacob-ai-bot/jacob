/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";
import {
  type Model,
  sendGptRequest,
  sendGptRequestWithSchema,
} from "~/server/openai/request";
import { parseTemplate } from "../utils";
import { traverseCodebase } from "../analyze/traverse";
import Parser from "web-tree-sitter";
import path, { join } from "path";
import fs from "fs/promises";
import { selectRelevantFiles } from "../agent/research";
import { db } from "~/server/db/db";
import { getFileLatestCommitHash } from "../git/operations";
import {
  type NewCodebaseFile,
  type CodebaseFileUpdate,
} from "../db/tables/codebaseContext.table";
import { standardizePath, type StandardizedPath } from "./files";

interface ExportInfo {
  name: string;
  exportType: string;
  line_no: number;
  code_referenced: string;
  source?: StandardizedPath;
  overview?: string;
}

export const ContextItemSchema = z.object({
  file: z.custom<StandardizedPath>(),
  code: z.array(z.string()),
  importStatements: z.array(z.string()),
  text: z.string(),
  diagram: z.string(),
  overview: z.string(),
  importedFiles: z.array(z.custom<StandardizedPath>()),
  taxonomy: z.string().optional(),
  exports: z.array(
    z.object({
      type: z.string().nullable().optional(),
      name: z.string(),
      exportType: z.string(),
      line_no: z.number(),
      code_referenced: z.string(),
      source: z.custom<StandardizedPath>().optional(),
    }),
  ),
  referencedImportDetails: z
    .array(
      z.object({
        name: z.string(),
        exportType: z.string(),
        line_no: z.number(),
        code_referenced: z.string(),
        source: z.string().optional(),
        overview: z.string().optional(),
      }),
    )
    .optional(),
});

export type ContextItem = z.infer<typeof ContextItemSchema>;

let typescriptParser: Parser;
let typescriptLanguage: Parser.Language;
let pythonParser: Parser;
let pythonLanguage: Parser.Language;

async function initializeTreeSitter() {
  if (!typescriptLanguage && !pythonLanguage) {
    await Parser.init({
      locateFile(scriptName: string) {
        return join(process.cwd(), "src", "server", "parsers", scriptName);
      },
    });
    typescriptLanguage = await Parser.Language.load(
      join(
        process.cwd(),
        "src",
        "server",
        "parsers",
        "tree-sitter-typescript.wasm",
      ),
    );
    pythonLanguage = await Parser.Language.load(
      join(
        process.cwd(),
        "src",
        "server",
        "parsers",
        "tree-sitter-python.wasm",
      ),
    );
  }
  if (!typescriptParser) {
    typescriptParser = new Parser();
    typescriptParser.setLanguage(typescriptLanguage);
  }
  if (!pythonParser) {
    pythonParser = new Parser();
    pythonParser.setLanguage(pythonLanguage);
  }
}

export async function getOrCreateCodebaseContext(
  projectId: number,
  rootPath: string,
  filePaths: StandardizedPath[],
  model: Model = "gpt-4o-mini-2024-07-18",
): Promise<ContextItem[]> {
  const contextItems: ContextItem[] = [];
  const filesToProcess: StandardizedPath[] = [];

  // First pass: Get existing contexts from the database
  for (const _filePath of filePaths) {
    const filePath = standardizePath(_filePath);
    const existingContext = await db.codebaseContext.findByOptional({
      projectId,
      filePath,
    });

    if (existingContext) {
      const currentHash = await getFileLatestCommitHash(filePath, {
        directory: rootPath,
      });

      if (existingContext.lastCommitHash === currentHash) {
        try {
          const parsedContext = ContextItemSchema.parse(
            existingContext.context,
          );
          contextItems.push(parsedContext);
          continue;
        } catch (error) {
          console.error(
            `Error parsing existing context for ${filePath}:`,
            error,
          );
        }
      }
    }

    filesToProcess.push(filePath);
  }

  // Second pass: Process remaining files in bulk
  if (filesToProcess.length > 0) {
    console.log("processing files for context", filesToProcess);

    const taxonomy = await generateTaxonomy(rootPath);
    const newContextItems = await getCodebaseContext(
      rootPath,
      filesToProcess,
      model,
      taxonomy,
    );

    for (let i = 0; i < newContextItems.length; i++) {
      const filePath = filesToProcess[i];
      const newContext = newContextItems[i];
      if (filePath && newContext) {
        const standardizedFilePath = standardizePath(filePath);
        await updateFileContext(
          projectId,
          standardizedFilePath,
          rootPath,
          newContext,
        );
        contextItems.push(newContext);
      }
    }
  }

  return contextItems.map((c) => ContextItemSchema.parse(c));
}

async function updateFileContext(
  projectId: number,
  filePath: StandardizedPath,
  rootPath: string,
  newContext: ContextItem,
): Promise<void> {
  const currentHash = await getFileLatestCommitHash(filePath, {
    directory: rootPath,
  });

  const existingFile = await db.codebaseContext.findByOptional({
    projectId,
    filePath,
  });

  if (existingFile) {
    const updateData: CodebaseFileUpdate = {
      lastCommitHash: currentHash,
      context: newContext,
      updatedAt: new Date(),
    };
    await db.codebaseContext.find(existingFile.id).update(updateData);
  } else {
    const newData: NewCodebaseFile = {
      projectId,
      filePath,
      lastCommitHash: currentHash,
      context: newContext,
    };
    await db.codebaseContext.create(newData);
  }
}

export const getCodebaseContext = async function (
  rootPath: string,
  files: StandardizedPath[] = [],
  model: Model = "gpt-4o-mini-2024-07-18", // "claude-3-5-sonnet-20240620", // "gpt-4o-mini-2024-07-18"
  taxonomy: string,
): Promise<ContextItem[]> {
  if (!rootPath) {
    throw new Error("No rootPath provided");
  }

  await initializeTreeSitter();
  const allFiles = traverseCodebase(rootPath)?.map((file) =>
    standardizePath(file),
  );
  let relevantFiles: StandardizedPath[] = files ?? [];
  if (!files.length) {
    // If no files are provided, analyze the entire codebase
    const query = `What are the 100 most important files in this codebase?`;
    relevantFiles = await selectRelevantFiles(query, undefined, allFiles, 100);
  }
  let analyzedFiles = new Set<string>();
  let contextSections: ContextItem[] = [];
  let iterations = 2;
  const originalRelevantFiles = relevantFiles;

  // The goal here is to find all the files that are relevant to the files we are analyzing.
  // If one of these files imports another file, add that file to the list of files to analyze (if it's not already in the list).
  // For any file that is imported, add the relevant exports to the file that imports it, then remove it from the list of files to analyze.
  while (relevantFiles.length > 0 && iterations > 0) {
    iterations--;
    const newContextSections = await analyzeFiles(
      relevantFiles,
      rootPath,
      model,
      allFiles,
      taxonomy,
    );
    contextSections = [...contextSections, ...newContextSections];
    analyzedFiles = new Set([...analyzedFiles, ...relevantFiles]);

    // Find new files to analyze based on imports
    const newImports = newContextSections
      .flatMap((section) => section.importedFiles)
      .filter((file) => !analyzedFiles.has(file) && allFiles.includes(file));

    relevantFiles = [...new Set(newImports)];
  }

  // Now that we have all of this information, we can add the relevant exports for each file
  // When that is done, we can remove any sections that were not in the original list of files
  await addRelevantExports(contextSections);
  if (files?.length) {
    contextSections = await removeExtraFiles(
      contextSections,
      originalRelevantFiles,
    );
  }
  const output = contextSections?.map((section) =>
    ContextItemSchema.parse(section),
  );

  return output;
};

async function removeExtraFiles(
  contextSections: ContextItem[],
  files: string[],
): Promise<ContextItem[]> {
  // Remove any sections that were not in the original list of files
  contextSections = contextSections.filter((section) =>
    files.some((file) => file.includes(section.file)),
  );
  return contextSections;
}

async function analyzeFiles(
  files: StandardizedPath[],
  rootPath: string,
  model: Model,
  allFiles: StandardizedPath[],
  taxonomy: string,
): Promise<ContextItem[]> {
  const codeStructure = await analyzeCodeStructure(rootPath, files);
  const contextSections = await createContextSections(codeStructure);
  await enhanceWithLLM(contextSections, model, allFiles, taxonomy);
  return contextSections;
}

async function addRelevantExports(
  contextSections: ContextItem[],
): Promise<void> {
  for (const section of contextSections) {
    section.referencedImportDetails = await getRelevantExports(
      section.file,
      contextSections,
    );
  }
}

async function analyzeCodeStructure(
  rootPath: string,
  files: StandardizedPath[],
): Promise<Record<string, any>> {
  const structure: Record<string, any> = {};

  for (const file of files) {
    try {
      const content = await fs.readFile(path.join(rootPath, file), "utf8");
      structure[file] = extractCodeInfo(content);
    } catch (error) {
      console.error(`Error analyzing file ${file}:`, error);
    }
  }
  return structure;
}

function extractCodeInfo(content: string): Record<string, any> {
  const info: Record<string, any> = {
    functions: [],
    classes: [],
    interfaces: [],
    types: [],
    variables: [],
    imports: [],
    exports: [],
    enums: [],
    others: [],
  };

  const typescriptTree = typescriptParser.parse(content);
  const typescriptFile = !typescriptTree.rootNode.hasError;
  const pythonTree = typescriptFile ? undefined : pythonParser.parse(content);
  const pythonFile = !pythonTree?.rootNode.hasError;

  const tree = typescriptFile ? typescriptTree : pythonTree;
  if (!tree || (!typescriptFile && !pythonFile)) {
    return info;
  }

  const typescriptQuery = typescriptLanguage.query(`
    (function_declaration) @function
    (method_definition) @function
    (arrow_function) @function
    (class_declaration) @class
    (interface_declaration) @interface
    (type_alias_declaration) @type
    (variable_declaration) @variable
    (lexical_declaration) @variable
    (import_statement) @import
    (export_statement) @export
    (enum_declaration) @enum
  `);

  // Consider handling __all__ exports in Python
  const pythonQuery = pythonLanguage.query(`
    (function_definition) @function
    (class_definition) @class
    (import_statement) @import
    (import_from_statement) @import
    (assignment) @variable
  `);

  const captures = typescriptFile
    ? typescriptQuery.captures(tree.rootNode)
    : pythonQuery.captures(tree.rootNode);

  for (const capture of captures) {
    const node = capture.node;
    const type = capture.name;

    if (type === "export") {
      const exportInfo = extractExportInfo(node);
      info.exports.push(exportInfo);
    } else {
      let name: string | undefined;
      const parentNode = node.parent;

      if (typescriptFile && node.type === "arrow_function") {
        if (
          parentNode &&
          (parentNode.type === "variable_declarator" ||
            parentNode.type === "pair")
        ) {
          name = parentNode.childForFieldName("name")?.text;
        }
      } else if (typescriptFile && node.type === "method_definition") {
        name = node.childForFieldName("name")?.text;
      } else if (pythonFile && node.type === "assignment") {
        if (
          parentNode?.type === "expression_statement" &&
          parentNode.parent?.type === "module"
        ) {
          name = node.childForFieldName("left")?.text;
        } else {
          // Ignore assignments that are not at the top level
          continue;
        }
      } else {
        name = node.childForFieldName("name")?.text;
      }

      const infoKey = type === "class" ? "classes" : `${type}s`;

      const category = infoKey in info ? infoKey : "others";

      info[category].push({
        name,
        line_no: node.startPosition.row + 1,
        code_referenced: node.text,
        type: node.type,
      });
    }
  }

  return info;
}

function extractExportInfo(node: Parser.SyntaxNode): ExportInfo {
  const exportInfo: ExportInfo = {
    name: "",
    exportType: "",
    line_no: node.startPosition.row + 1,
    code_referenced: node.text,
  };

  const declaration = node.childForFieldName("declaration");
  if (declaration) {
    exportInfo.exportType = declaration.type;
    if (declaration.type === "lexical_declaration") {
      const declarators = declaration.descendantsOfType("variable_declarator");
      exportInfo.name = declarators
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        .map((d) => d.childForFieldName("name")?.text ?? "")
        .filter(Boolean)
        .join(", ");
    } else {
      exportInfo.name = declaration.childForFieldName("name")?.text ?? "";
    }
  } else if (node.childForFieldName("source")) {
    exportInfo.exportType = "re-export";
    exportInfo.source = standardizePath(
      node.childForFieldName("source")?.text ?? "",
    );
  }

  return exportInfo;
}
async function createContextSections(
  codeStructure: Record<string, any>,
): Promise<ContextItem[]> {
  const sections: ContextItem[] = [];

  for (const [filePath, fileInfo] of Object.entries(codeStructure)) {
    const fileSection: ContextItem = {
      file: standardizePath(filePath),
      code: [],
      text: "",
      diagram: "",
      overview: "",
      importedFiles: [],
      importStatements: [],
      exports: [],
    };

    // First, process exports
    if (fileInfo.exports) {
      fileSection.exports = (fileInfo.exports ?? []) as ExportInfo[];
    }

    // Create a set of exported code references for quick lookup
    const exportedCodeSet = new Set(
      fileSection.exports.map((e) => e.code_referenced ?? ""),
    );

    // Process other entities
    for (const [entityType, entities] of Object.entries(
      fileInfo as Record<string, any[]>,
    )) {
      if (entityType === "imports") {
        for (const entity of entities) {
          fileSection.importStatements.push(`${entity.code_referenced ?? ""}`);
        }
      } else if (entityType !== "exports") {
        for (const entity of entities) {
          // Check if the code is not already in exports before adding to code array
          if (
            ![...exportedCodeSet].some((exportedCode) =>
              exportedCode.includes((entity.code_referenced ?? "") as string),
            )
          ) {
            fileSection.code.push(
              `(${entity.type}) ${entity.line_no}: ${entity.code_referenced}`,
            );
          }
        }
      }
    }

    sections.push(fileSection);
  }
  return sections;
}

async function enhanceWithLLM(
  sections: ContextItem[],
  model: Model,
  allFiles: StandardizedPath[],
  taxonomy: string,
): Promise<void> {
  const maxConcurrentRequests = 20;
  for (let i = 0; i < sections.length; i += maxConcurrentRequests) {
    const chunk = sections.slice(i, i + maxConcurrentRequests);
    const enhanceTasks = chunk.map(async (section) => {
      try {
        const enhancedContent = await generateDescription(
          section,
          model,
          allFiles,
          taxonomy,
        );
        section.text = enhancedContent.description;
        section.overview = enhancedContent.overview;
        enhancedContent.importedFiles = filterImports(
          enhancedContent.importedFiles,
          allFiles,
        );
        section.importedFiles = enhancedContent.importedFiles;
        section.diagram = enhancedContent.diagram;
        section.taxonomy = standardizePath(enhancedContent.taxonomy);
      } catch (error) {
        console.error(`Error enhancing section ${section.file}:`, error);
      }
    });

    await Promise.all(enhanceTasks);
  }
}

const EnhancedDescriptionSchema = z.object({
  description: z.string(),
  overview: z.string(),
  importedFiles: z.array(z.custom<StandardizedPath>()),
  diagram: z.string(),
  taxonomy: z.string(),
});

type EnhancedDescription = z.infer<typeof EnhancedDescriptionSchema>;

async function generateDescription(
  section: ContextItem,
  model: Model,
  allFiles: StandardizedPath[],
  taxonomy: string,
): Promise<EnhancedDescription> {
  const templateParams = {
    section: JSON.stringify(section, null, 2),
    allFiles: allFiles.join("\n"),
    taxonomy: taxonomy,
    enhancedDescriptionSchema: `const EnhancedDescriptionSchema = z.object({
  description: z.string(),
  overview: z.string(),
  importedFiles: z.array(z.string()),
  diagram: z.string(),
  taxonomy: z.string(),
})`,
  };

  const systemPrompt = parseTemplate(
    "codebase_context",
    "generate_description",
    "system",
    templateParams,
  );
  const userPrompt = parseTemplate(
    "codebase_context",
    "generate_description",
    "user",
    templateParams,
  );

  try {
    const result = await sendGptRequestWithSchema(
      userPrompt,
      systemPrompt,
      EnhancedDescriptionSchema,
      0.3,
      undefined,
      2,
      model,
    );

    return result as EnhancedDescription;
  } catch (error) {
    console.error("Error generating or parsing description:", error);
    return {
      description: "Error generating description",
      overview: "Error generating overview",
      importedFiles: [],
      diagram: "Error generating diagram",
      taxonomy: "Error generating taxonomy",
    };
  }
}

function filterImports(
  importedFiles: StandardizedPath[],
  allFiles: StandardizedPath[],
): StandardizedPath[] {
  const removedFiles = importedFiles.filter((imp) => !allFiles.includes(imp));
  const updatedImports = importedFiles.filter((imp) => allFiles.includes(imp));

  if (removedFiles.length > 0) {
    console.log("Files removed from dependencies:", removedFiles);
  }

  return updatedImports.map((imp) => standardizePath(imp));
}

export const getRelevantExports = async function (
  filePath: string,
  allContext: ContextItem[],
): Promise<ExportInfo[]> {
  const mainContext = allContext.find((item) => item.file === filePath);
  if (!mainContext) {
    throw new Error(`Context for file ${filePath} not found`);
  }

  const relevantExports = filterImportedContext(mainContext, allContext);

  return relevantExports;
};

function filterImportedContext(
  parentFile: ContextItem,
  allContext: ContextItem[],
): ExportInfo[] {
  const relevantImports: ExportInfo[] = [];

  for (const importedFile of parentFile.importedFiles) {
    const importedContext = allContext.find(
      (item) => item.file === importedFile,
    );
    if (importedContext) {
      const usedExports = importedContext.exports.filter((exp) =>
        parentFile.importStatements.some((importStatement) =>
          importStatement.includes(exp.name),
        ),
      ) as ExportInfo[];

      // Add the file and overview from the imported context
      usedExports.forEach((exp) => {
        relevantImports.push({
          source: standardizePath(importedFile),
          overview: importedContext.overview,
          ...exp,
        });
      });
    }
  }

  return relevantImports;
}

export async function generateTaxonomy(rootPath: string): Promise<string> {
  const allFiles = traverseCodebase(rootPath);
  const fileList = allFiles.join("\n");
  const templateParams = {
    files: fileList,
  };

  const systemPrompt = parseTemplate(
    "codebase_context",
    "taxonomy",
    "system",
    templateParams,
  );
  const userPrompt = parseTemplate(
    "codebase_context",
    "taxonomy",
    "user",
    templateParams,
  );

  const taxonomy = await sendGptRequest(
    userPrompt,
    systemPrompt,
    0.3,
    undefined,
    2,
    60000,
  );

  return taxonomy ?? "";
}

export async function removeUnusedContextFiles(
  projectId: number,
  rootPath: string,
): Promise<void> {
  // Get all files in the codebase
  const allFiles = traverseCodebase(rootPath).map(standardizePath);
  const allFilesSet = new Set(allFiles);

  // Fetch all context items for the given projectId
  const allContextItems = await db.codebaseContext
    .select("id", "filePath")
    .where({
      projectId,
    });
  if (!allContextItems?.length) {
    return;
  }

  // Identify and delete context items for files that no longer exist
  const deleteTasks = allContextItems.map(async (item) => {
    const standardizedFilePath = standardizePath(item.filePath);
    if (!allFilesSet.has(standardizedFilePath)) {
      await db.codebaseContext.find(item.id).delete();
      console.log(`Deleted context for removed file: ${standardizedFilePath}`);
    }
  });

  // Wait for all delete operations to complete
  await Promise.all(deleteTasks);

  console.log(
    `Finished removing unused context files for project ${projectId}`,
  );
}
