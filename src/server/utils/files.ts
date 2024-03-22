import fs from "fs";
import path from "path";
import ignore, { Ignore } from "ignore";
import parseDiff from "parse-diff";
import { removeMarkdownCodeblocks } from ".";

type LineLengthMap = Record<string, number>;

export const concatenateFiles = (
  rootDir: string,
  fileNamesToInclude?: string[],
  fileNamesToCreate?: null | string[],
) => {
  console.log("concatenateFiles", rootDir, fileNamesToInclude);
  const lineLengthMap: LineLengthMap = {};
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
        const fileContent = fs.readFileSync(filePath).toString("utf-8");
        output.push(fileContent);
        const lineLength =
          fileContent.split("\n").length - (fileContent.endsWith("\n") ? 1 : 0);
        lineLengthMap[relativePath] = lineLength;
      }
    });
  };

  walkDir(rootDir);

  (fileNamesToCreate ?? []).forEach((fileName) =>
    output.push(`__FILEPATH__${fileName}__\n`),
  );
  const code = output.join("");
  return { code, lineLengthMap };
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

export interface CodeComment {
  path: string;
  body: string;
  line: number;
}

export const extractPRCommentsFromFiles = (concatFileContent: string) => {
  const sections = concatFileContent.split(/__FILEPATH__(.*?)__\n/).slice(1);

  const comments: CodeComment[] = [];

  for (let i = 0; i < sections.length; i += 2) {
    const path = sections[i];
    const fileContent = sections[i + 1];
    const lines = fileContent.split("\n");

    let lineNumber = 0;
    let currentComment: string | undefined;
    for (const line of lines) {
      if (currentComment !== undefined) {
        if (line.trim() === "__COMMENT_END__") {
          comments.push({ body: currentComment, line: lineNumber, path });
          currentComment = undefined;
        } else {
          currentComment = currentComment ? `${currentComment}\n${line}` : line;
        }
        continue;
      } else if (line.trim() === "__COMMENT_START__") {
        currentComment = "";
        continue;
      } else lineNumber++;
    }
  }
  return comments;
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

interface NewOrModifiedRange {
  start: number;
  end: number;
}

type FilesRangesMap = Record<string, NewOrModifiedRange[]>;

export function getNewOrModifiedRangesMapFromDiff(diff: string) {
  const rangeMap: FilesRangesMap = {};
  parseDiff(diff).forEach((file) => {
    if (!file.to) {
      return;
    }
    const ranges: NewOrModifiedRange[] = [];
    let currentRange: NewOrModifiedRange | undefined;
    file.chunks.forEach(({ changes }) => {
      changes.forEach((change) => {
        switch (change.type) {
          case "normal":
          case "del":
            if (currentRange) {
              ranges.push(currentRange);
              currentRange = undefined;
            }
            break;
          case "add":
            if (!currentRange) {
              currentRange = {
                start: change.ln,
                end: change.ln,
              };
            } else {
              currentRange.end = change.ln;
            }
            break;
        }
      });
      if (currentRange) {
        ranges.push(currentRange);
      }
    });
    if (!rangeMap[file.to]) {
      rangeMap[file.to] = ranges;
    } else {
      rangeMap[file.to].push(...ranges);
    }
  });
  return rangeMap;
}
