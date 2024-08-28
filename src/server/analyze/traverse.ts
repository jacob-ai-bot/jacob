import fs from "fs";
import path from "path";
import ignore from "ignore";
import { type StandardizedPath, standardizePath } from "../utils/files";

export function traverseCodebase(rootPath: string): StandardizedPath[] {
  const gitignorePath = path.join(rootPath, ".gitignore");
  const gitignoreContent = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, "utf-8")
    : "";

  const ignoreFilter = ignore().add(gitignoreContent);

  function processDirectory(directory: string): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      const relativePath = path.relative(rootPath, fullPath);

      if (ignoreFilter.ignores(relativePath)) continue;

      if (entry.isDirectory()) {
        if (entry.name === "node_modules") continue;
        files.push(...processDirectory(fullPath));
      } else if (entry.isFile() && isRelevantFile(entry.name)) {
        files.push(relativePath);
      }
    }

    return files;
  }

  return processDirectory(rootPath)
    .map(standardizePath)
    .filter((p) => p?.length);
}

function isRelevantFile(fileName: string): boolean {
  return (
    /\.(ts|tsx|js|jsx|py|example)$/.test(fileName) || isSpecialFile(fileName)
  );
}

function isSpecialFile(fileName: string): boolean {
  return fileName.includes(".env.") || fileName.includes("README");
}
