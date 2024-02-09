import { Project, SourceFile } from "ts-morph";
import fs, { promises as fsPromises, Dirent } from "fs";
import { RepoSettings } from "../utils";
import { Language } from "../utils/settings";
import path from "path";

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

export const getSourceMap = (
  rootPath: string,
  repoSettings?: RepoSettings,
  targetFilePath?: string,
) => {
  const files = getFiles(rootPath, repoSettings, targetFilePath);
  const sourceMap = generateMapFromFiles(files);
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

    const configPath = rootPath + "/tsconfig.json"; // Path to tsconfig.json
    const project = new Project({
      tsConfigFilePath: configPath,
    });

    const sourceFiles = project.getSourceFiles();

    // Check to see if the repoSettings.directories.types is set
    // If it is, use that to find the types file
    const { types = "types" } = repoSettings?.directories ?? {};
    const typesPath = path.join(rootPath, types);
    if (fs.existsSync(typesPath)) {
      // first check to see if this is a directory or a file path
      // if it's a file path, use that, otherwise traverse the directory to find a types file
      if (fs.lstatSync(typesPath).isFile()) {
        sourceFile = project.addSourceFileAtPath(typesPath);
      } else {
        const files = fs.readdirSync(typesPath);
        for (const file of files) {
          if (
            file === "types.ts" ||
            file === "interfaces.ts" ||
            file === "index.d.ts"
          ) {
            try {
              sourceFile = project.addSourceFileAtPath(typesPath + "/" + file);
            } catch (error) {
              // if there is an error, continue to the next file
            }
          }
        }
      }
    }

    // If the types directory isn't set or the file is not there, look for it in the source files
    if (!sourceFile) {
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
    }

    // If we still haven't found the types file, look for it in the root
    if (!sourceFile) {
      console.log("no types file found, looking for types.ts or src/types.ts");
      // check to see if the file exists at the root
      let filePath = rootPath + "types.ts";
      console.log("filePath", filePath);
      if (fs.existsSync(filePath)) {
        sourceFile = project.addSourceFileAtPath(filePath);
      } else {
        filePath = rootPath + "src/types.ts";
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
    throw new Error("Error in getTypes: " + error);
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

const getFiles = (
  rootPath: string,
  repoSettings?: RepoSettings,
  targetFilePath?: string,
): SourceMap[] => {
  if (
    (repoSettings?.language ?? Language.TypeScript)?.toLowerCase() !==
    "typescript"
  ) {
    return [];
  }

  const configPath = rootPath + "/tsconfig.json"; // Path to tsconfig.json
  const project = new Project({
    tsConfigFilePath: configPath,
  });

  const sourceFiles = project.getSourceFiles();

  const files = sourceFiles
    .map((sourceFile) => {
      let isTargetFile = false;
      const filePath = sourceFile.getFilePath();
      const fileName = sourceFile.getBaseName();
      const relativePath = filePath.replace(rootPath, "");
      if (targetFilePath && filePath !== targetFilePath) {
        return null;
      } else {
        if (targetFilePath) isTargetFile = true;
      }
      if (!isTargetFile) {
        // ignore files
        if (FILES_TO_IGNORE.includes(fileName)) {
          return null;
        }
        // ignore extensions
        if (EXTENSIONS_TO_IGNORE.includes(fileName.split(".").pop()!)) {
          return null;
        }
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
          const path = param.getType().getText()?.split(".")[0] || "";
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
  return files;
};

const generateMapFromFiles = (files: SourceMap[]) => {
  let sourceMap: string = "";
  // loop through the result and create a map of the source code
  for (const file of files) {
    // start with the file path
    sourceMap += "\n" + file.relativePath + ":";

    // now add the interface names
    if (file.interfaces.length > 0) {
      sourceMap += "\n\tinterfaces:";
      for (const int of file.interfaces) {
        sourceMap += "\n\t\t" + int.name;
        // add properties and methods for each interface
        if (int.properties.length > 0) {
          sourceMap += " - ";
          for (const prop of int.properties) {
            let typeName = prop.type;
            if (typeName.includes("/Users") && typeName.includes(".")) {
              // Get the part of the typeAliasType after the last .
              typeName = typeName.split(".").pop()!;
            }
            sourceMap += prop.name + ": " + typeName;
          }
        }
        if (int.methods.length > 0) {
          sourceMap += "\n\t\t\tmethods: ";
          for (const method of int.methods) {
            sourceMap += " " + method.name + " ";
            // add commas between methods but not after the last method
            sourceMap +=
              method === int.methods[int.methods.length - 1] ? "" : ",";
            // now add the parameters for each method (add on the same line, enclosed in parentheses)
            if (method.parameters.length > 0) {
              sourceMap += "(";
              for (const param of method.parameters) {
                let typeName = param.type;
                if (typeName.includes("/Users") && typeName.includes(".")) {
                  // Get the part of the typeAliasType after the .
                  typeName = typeName.split(".").pop()!;
                }
                // add the parameter name and type. If it's the last parameter, don't add a comma
                sourceMap +=
                  param.name +
                  ": " +
                  typeName +
                  (param === method.parameters[method.parameters.length - 1]
                    ? ""
                    : ", ");
              }
              sourceMap += ")";
            }
            // now add the return type (add on the same line, preceded by a colon)
            sourceMap += ": " + method.returnType + " ";
          }
        }
      }
    }
  }
  // remove some of the extra strings we don't need
  sourceMap = sourceMap.replaceAll("/node_modules/next/dist/", "");

  return sourceMap;
};
