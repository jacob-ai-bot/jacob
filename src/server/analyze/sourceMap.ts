import { Project, type SourceFile } from "ts-morph";
import fs, { promises as fsPromises, type Dirent } from "fs";
import { type RepoSettings } from "../utils";
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

export const getSourceMap = (rootPath: string, repoSettings?: RepoSettings) => {
  const files = getFiles(rootPath, repoSettings);
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

    const configPath = path.join(rootPath, "tsconfig.json"); // Path to tsconfig.json
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
  const imageExtensions = [".jpg", ".jpeg", ".png", ".