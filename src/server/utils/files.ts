import fs from "fs";
import path from "path";
import ignore, { Ignore } from "ignore";
import { removeMarkdownCodeblocks } from ".";

export const concatenateFiles = (
  rootDir: string,
  fileNamesToInclude?: string[],
  fileNamesToCreate?: null | string[],
) => {
  console.log("concatenateFiles", rootDir, fileNamesToInclude);
  let gitignore: Ignore | null = null;
  const gitignorePath = path.join(rootDir, ".gitignore");

  if (fs.existsSync(gitignorePath)) {
    gitignore = ignore().add(fs.readFileSync(gitignorePath).toString());
  }

  const output: string[] = [];

  const shouldIncludeFile = (relativePath: string, fileName: string) => {
    if (!fileNamesToInclude || fileNamesToInclude.length === 0) return true;

    const absolutePath = path.join(rootDir, relativePath); // Calculate the absolute path

    // Normalize and convert paths to lowercase for case-insensitive comparison
    const normalizedRelativePath = path.normalize(relativePath).toLowerCase();
    const normalizedAbsolutePath = path.normalize(absolutePath).toLowerCase();

    for (const fileToInclude of fileNamesToInclude) {
      const normalizedFileToInclude = path
        .normalize(fileToInclude)
        .toLowerCase();

      if (
        normalizedFileToInclude === normalizedRelativePath ||
        normalizedFileToInclude === `/${normalizedRelativePath}` ||
        normalizedFileToInclude === fileName.toLowerCase() ||
        normalizedFileToInclude === normalizedAbsolutePath
      ) {
        return true;
      }
    }

    return false;
  };

  const walkDir = (dir: string) => {
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const relativePath = path.relative(rootDir, filePath);

      if (gitignore && gitignore.ignores(relativePath)) return;

      if (fs.statSync(filePath).isDirectory()) {
        walkDir(filePath);
      } else {
        // if (extensionFilter && path.extname(file) !== extensionFilter) return;
        if (!shouldIncludeFile(relativePath, file)) {
          return;
        }

        output.push(`__FILEPATH__${relativePath}__\n`);
        output.push(fs.readFileSync(filePath).toString("utf-8"));
      }
    });
  };

  walkDir(rootDir);

  (fileNamesToCreate ?? []).forEach((fileName) =>
    output.push(`__FILEPATH__${fileName}__\n`),
  );
  return output.join("");
};

export const reconstructFiles = (
  concatFileContent: string,
  outputPath: string,
) => {
  const sections = concatFileContent.split(/__FILEPATH__(.*?)__\n/).slice(1);

  for (let i = 0; i < sections.length; i += 2) {
    const filePath = sections[i];
    let fileContent = sections[i + 1];
    const targetPath = path.join(outputPath, filePath);

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    // if the first line in file content starts with _, remove it
    // keep doing this until the first line doesn't start with _
    while (
      fileContent?.length > 0 &&
      fileContent.split("\n")[0].startsWith("_")
    ) {
      fileContent = fileContent.split("\n").slice(1).join("\n");
    }

    // if the code is wrapped in a code block, remove the code block
    fileContent = removeMarkdownCodeblocks(fileContent);
    fs.writeFileSync(targetPath, fileContent);
  }
};

export const saveNewFile = (
  rootDir: string,
  filePath: string,
  fileContent: string,
) => {
  // if the code is wrapped in a code block, remove the code block
  fileContent = removeMarkdownCodeblocks(fileContent);

  // save the file to the target path
  const targetPath = path.join(rootDir, filePath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, fileContent);
};
