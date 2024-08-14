import fs from "fs";
import path from "path";
import ignore from "ignore";
import { type StandardizedPath, standardizePath } from "../utils/files";

export function traverseCodebase(rootPath: string): StandardizedPath[] {
  const gitignoreContent = fs.readFileSync(
    path.join(rootPath, ".gitignore"),
    "utf-8",
  );

  const ignoreFilter = ignore().add(gitignoreContent);

  function processDirectory(directory: string, files: string[] = []): string[] {
    const entries = fs.readdirSync(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      const relativePath = path.relative(rootPath, fullPath);
      if (entry.isDirectory()) {
        if (!ignoreFilter.ignores(relativePath)) {
          const directoryFiles = processDirectory(fullPath, files);
          for (const file of directoryFiles) {
            // if the file isn't already in the list of files, add it
            if (!files.includes(file)) {
              files.push(file);
            }
          }
        }
      } else if (
        entry.isFile() &&
        isRelevantFile(fullPath) &&
        !ignoreFilter.ignores(relativePath)
      ) {
        if (fullPath.includes("node_modules")) {
          throw new Error("ERROR: parsing a file from node_modules found");
        }
        if (!files.includes(relativePath)) {
          files.push(relativePath);
        }
      }
    }
    return files;
  }

  return processDirectory(rootPath)?.map(standardizePath);
}

function isRelevantFile(filePath: string): boolean {
  return /\.(ts|tsx|js|jsx)$/.test(filePath);
}
