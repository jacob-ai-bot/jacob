import { Project, type SourceFile } from "ts-morph";
import fs, { promises as fsPromises, type Dirent } from "fs";
import path from "path";

import { type RepoSettings } from "../utils";
import { traverseCodebase } from "./traverse";
import { Language } from "~/types";

const FILES_TO_IGNORE = [
  "types.ts",
  "[...nextauth].ts",
  "next-env.d.ts",
  "typings.d.ts",
];

const EXTENSIONS_TO_IGNORE = [
  "js",
  "mjs",
  "cjs",
  "json",
  "lock",
  "md",
  "yml",
  "yaml",
];

type SourceMap = {
  filePath: string;
  fileName: string;
  relativePath: string;
  classes: {
    name: string;
    properties: {
      name: string;
      type: string;
      modifiers: string[];
    }[];
    methods: {
      name: string;
      parameters: {
        name: string;
        type: string;
      }[];
      returnType: string;
    }[];
  }[];
  enums: {
    name: string;
    members: {
      name: string;
      value: string | undefined;
    }[];
  }[];
  functions: {
    name: string;
    parameters: {
      name: string;
      type: string;
    }[];
    returnType: string;
  }[];
  imports: {
    moduleSpecifier: string;
    namedImports: string[];
  }[];
  interfaces: {
    name: string;
    properties: {
      name: string;
      type: string;
    }[];
    methods: {
      name: string;
      parameters: {
        name: string;
        type: string;
      }[];
      returnType: string;
    }[];
  }[];
  variables: {
    declarations: {
      name: string;
      type: string | undefined;
      initializer: string | undefined;
    }[];
  }[];
  typeAliases: {
    name: string;
    type: string;
  }[];
  exportedDeclarations: {
    name: string;
    declarations: {
      kind: string;
      text: string;
    }[];
  }[];
};

export const getSourceMap = (rootPath: string, repoSettings?: RepoSettings) => {
  const allFileNames = traverseCodebase(rootPath);
  const files = getFiles(rootPath, allFileNames, repoSettings);
  const sourceMap = generateMapFromFiles(rootPath, files);
  return sourceMap;
};

export const getTypes = (
  rootPath: string,
  repoSettings?: RepoSettings,
): string => {
  try {
    if (
      (repoSettings?.language ?? Language.TypeScript).toLowerCase() !==
      "typescript"
    ) {
      return "";
    }

    let sourceFile: SourceFile | undefined;
    const defaultTSConfig = "tsconfig.json";
    const tsConfig = repoSettings?.directories?.tsConfig ?? defaultTSConfig;
    const configPath = path.join(rootPath, tsConfig); // Path to tsconfig.json
    const project = new Project({
      tsConfigFilePath: configPath,
    });

    const sourceFiles = project.getSourceFiles();

    sourceFiles.map((file) => {
      const filePath = file.getFilePath();
      const fileName = file.getBaseName();
      const relativePath = filePath.replaceAll(rootPath, "");
      if (
        fileName === "types.ts" ||
        fileName === "interfaces.ts" ||
        relativePath === "/interfaces/index.ts" ||
        relativePath === "/types/index.ts"
      ) {
        console.log("found types file", fileName);
        sourceFile = file;
      }
    });

    if (!sourceFile) {
      console.log("no types file found, looking for types.ts or src/types.ts");
      // check to see if the file exists at the root
      let filePath = path.join(rootPath, "types.ts");
      console.log("filePath", filePath);
      if (fs.existsSync(filePath)) {
        sourceFile = project.addSourceFileAtPath(filePath);
      } else {
        filePath = path.join(rootPath, "src/types.ts");
        console.log("filePath", filePath);
        if (fs.existsSync(filePath)) {
          sourceFile = project.addSourceFileAtPath(filePath);
        } else {
          console.log("no types file found");
          return "";
        }
      }
    }

    return sourceFile?.getText() || "";
  } catch (error) {
    console.log("error in getTypes", error);
    throw new Error(`Error in getTypes: ${String(error)}`);
  }
};

// Recursive function to get all image files
async function getImageFiles(
  dirPath: string,
  imageExtensions: string[],
): Promise<string[]> {
  const entries: Dirent[] = await fsPromises.readdir(dirPath, {
    withFileTypes: true,
  });
  const filePaths = await Promise.all(
    entries.map(async (entry) => {
      const res = path.resolve(dirPath, entry.name);
      return entry.isDirectory() ? getImageFiles(res, imageExtensions) : res;
    }),
  );
  // Flatten the array and filter out non-image files
  return filePaths
    .flat()
    .filter((file) => imageExtensions.includes(path.extname(file)));
}

export const getImages = async (
  rootPath: string,
  repoSettings?: RepoSettings,
): Promise<string> => {
  // the repoSettings.directories.staticAssets is the root directory, if that isn't set then use /public
  const { staticAssets = "public" } = repoSettings?.directories ?? {};
  const publicPath = path.join(rootPath, staticAssets);

  try {
    await fsPromises.access(publicPath);
  } catch (error) {
    return "";
  }

  // get all the image files in the static directory and subdirectories
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".svg"];
  const imageFiles = await getImageFiles(publicPath, imageExtensions);

  if (imageFiles.length === 0) {
    return "";
  }

  let imagesString = "Images: \n\t";
  imagesString += imageFiles.map((file) => `${file}`).join("\n\t");
  return imagesString;
};

type RelativePathOnly = Pick<SourceMap, "relativePath">;
type SourceMapOrRelativePathOnly = SourceMap | RelativePathOnly;

const getFiles = (
  rootPath: string,
  allFileNames: string[],
  repoSettings?: RepoSettings,
): SourceMapOrRelativePathOnly[] => {
  if (
    (repoSettings?.language ?? Language.TypeScript)?.toLowerCase() !==
    "typescript"
  ) {
    return allFileNames.map((fileName) => ({ relativePath: fileName }));
  }

  const configPath = rootPath + "/tsconfig.json"; // Path to tsconfig.json
  const project = new Project({
    tsConfigFilePath: configPath,
  });

  const sourceFiles = project.getSourceFiles();

  const files = sourceFiles
    .map((sourceFile) => {
      const filePath = sourceFile.getFilePath();
      const fileName = sourceFile.getBaseName();
      const relativePath = filePath.replace(rootPath, "");
      // ignore files
      if (FILES_TO_IGNORE.includes(fileName)) {
        return null;
      }
      // ignore extensions
      if (EXTENSIONS_TO_IGNORE.includes(fileName.split(".").pop()!)) {
        return null;
      }
      const classes = sourceFile.getClasses().map((cls) => ({
        name: cls.getName(),
        properties: cls.getProperties().map((prop) => ({
          name: prop.getName(),
          type: prop.getType().getText(),
          modifiers: prop.getModifiers().map((mod) => mod.getText()),
        })),
        methods: cls.getMethods().map((method) => ({
          name: method.getName(),
          parameters: method.getParameters().map((param) => ({
            name: param.getName(),
            type: param.getType().getText(),
          })),
          returnType: method.getReturnType().getText(),
        })),
      }));
      const enums = sourceFile.getEnums().map((en) => ({
        name: en.getName(),
        members: en.getMembers().map((member) => ({
          name: member.getName(),
          value: member.getValue(),
        })),
      }));
      const functions = sourceFile.getFunctions().map((func) => ({
        name: func.getName(),
        parameters: func.getParameters().map((param) => {
          const path = param.getType().getText()?.split(".")[0] ?? "";
          return {
            name: param.getName(),
            type: param
              .getType()
              .getText()
              .replace(path + ".", ""),
          };
        }),
        returnType: func.getReturnType().getText(),
      }));
      const imports = sourceFile.getImportDeclarations().map((imp) => ({
        moduleSpecifier: imp.getModuleSpecifierValue(),
        namedImports: imp.getNamedImports().map((imp) => imp.getName()),
      }));
      const interfaces = sourceFile.getInterfaces().map((int) => ({
        name: int.getName(),
        properties: int.getProperties().map((prop) => ({
          name: prop.getName(),
          type: prop.getType().getText(),
        })),
        methods: int.getMethods().map((method) => ({
          name: method.getName(),
          parameters: method.getParameters().map((param) => ({
            name: param.getName(),
            type: param.getType().getText(),
          })),
          returnType: method.getReturnType().getText(),
        })),
      }));
      const variables = sourceFile
        .getVariableStatements()
        .map((variableStatement) => ({
          declarations: variableStatement
            .getDeclarationList()
            .getDeclarations()
            .map((declaration) => {
              return {
                name: declaration.getName(),
                type: declaration.getType().getText()?.replaceAll(rootPath, ""),
                initializer: declaration
                  .getInitializer()
                  ?.getText()
                  .split("=>")[0],
              };
            }),
        }));
      const typeAliases = sourceFile.getTypeAliases().map((typeAlias) => ({
        name: typeAlias.getName(),
        type: typeAlias.getType().getText(),
      }));
      const exportedDeclarations = Array.from(
        sourceFile.getExportedDeclarations(),
      ).map(([name, declarations]) => ({
        name,
        declarations: declarations.map((declaration) => ({
          kind: declaration.getKindName(),
          text: declaration.getText(),
        })),
      }));

      return {
        filePath,
        fileName,
        relativePath,
        classes,
        enums,
        functions,
        imports,
        interfaces,
        variables,
        typeAliases,
        exportedDeclarations,
      };
    })
    .filter((file) => file !== null) as SourceMap[];

  const remainingFiles = allFileNames.filter(
    (fileName) => !files.some(({ relativePath }) => relativePath === fileName),
  );

  return [
    ...files,
    ...remainingFiles.map((fileName) => ({ relativePath: fileName })),
  ];
};

function cleanType(rootPath: string, type: string) {
  return type.replace(
    new RegExp(`import\\("${rootPath}\\/[^"]+"\\)\\.`, "g"),
    "",
  );
}

export const generateMapFromFiles = (
  rootPath: string,
  files: SourceMapOrRelativePathOnly[],
) => {
  let sourceMap = "";
  // loop through the result and create a map of the source code
  for (const file of files) {
    // start with the file path
    sourceMap += `${file.relativePath}:\n`;

    if (!("filePath" in file)) {
      // if we don't have a full SourceMap object, stop here and continue
      continue;
    }

    // now add the interface names
    const interfaces = file.interfaces.map((int) => {
      // add properties and methods for each interface
      const properties = int.properties.map(
        (prop) => `    ${prop.name}: ${cleanType(rootPath, prop.type)};\n`,
      );
      const methods = int.methods.map((method) => {
        const params = method.parameters.map(
          (param) => `${param.name}: ${cleanType(rootPath, param.type)}`,
        );
        // now add the return type (add on the same line, preceded by a colon)
        return `    ${method.name}(${params.join(", ")}): ${cleanType(
          rootPath,
          method.returnType,
        )};\n`;
      });
      return `  interface ${int.name} {\n${properties.join("")}${methods.join(
        "",
      )}  }\n`;
    });
    sourceMap += interfaces.join("");

    const functions = file.functions.map((func) => {
      const params = func.parameters
        .map((param) => `${param.name}: ${cleanType(rootPath, param.type)}`)
        .join(", ");
      return `  function ${func.name}(${params}): ${cleanType(
        rootPath,
        func.returnType,
      )};\n`;
    });
    sourceMap += functions.join("");

    // TODO: consider including classes, enums, variables, typeAliases, and exportedDeclarations
  }
  // remove some of the extra strings we don't need
  sourceMap = sourceMap.replaceAll("/node_modules/next/dist/", "");

  return sourceMap;
};
