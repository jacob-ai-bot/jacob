import fs from "fs";
import path from "path";
import ignore, { type Ignore } from "ignore";
import parseDiff from "parse-diff";
import { applyPatches } from "diff";
import { removeMarkdownCodeblocks } from "~/app/utils";
import { promisify } from "util";
import { exec as execCallback } from "child_process";

type LineLengthMap = Record<string, number>;

interface NewOrModifiedRange {
  start: number;
  end: number;
}

export type FilesRangesMap = Record<string, NewOrModifiedRange[]>;

export const getFiles = (
  rootDir: string,
  fileNamesToInclude: string[],
  shouldAddLineNumbers = true,
) => {
  let output = "";
  for (const fileName of fileNamesToInclude) {
    const filePath = path.join(rootDir, fileName);
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, "utf-8");
        output += `File: ${fileName}\n`;
        output += shouldAddLineNumbers
          ? addLineNumbers(fileContent)
          : fileContent;
      } catch (error) {
        console.error(`Error reading file ${fileName}`);
      }
    } else {
      console.error(`File not found: ${fileName}`);
    }
  }
  return output;
};

export const concatenateFiles = (
  rootDir: string,
  newOrModifiedRangeMap?: FilesRangesMap,
  fileNamesToInclude?: string[],
  fileNamesToCreate?: null | string[],
) => {
  console.log(
    "concatenateFiles",
    rootDir,
    newOrModifiedRangeMap,
    fileNamesToInclude,
    fileNamesToCreate,
  );
  const includesExistingFiles = !!fileNamesToInclude?.length;
  const lineLengthMap: LineLengthMap = {};
  let gitignore: Ignore | null = null;
  const gitignorePath = path.join(rootDir, ".gitignore");

  if (fs.existsSync(gitignorePath)) {
    gitignore = ignore().add(fs.readFileSync(gitignorePath).toString());
  }

  const output: string[] = [];

  const shouldIncludeFile = (relativePath: string, fileName: string) => {
    // if (!fileNamesToInclude || fileNamesToInclude.length === 0) return false;

    const absolutePath = path.join(rootDir, relativePath); // Calculate the absolute path

    // Normalize and convert paths to lowercase for case-insensitive comparison
    const normalizedRelativePath = path.normalize(relativePath).toLowerCase();
    const normalizedAbsolutePath = path.normalize(absolutePath).toLowerCase();

    for (const fileToInclude of fileNamesToInclude ?? []) {
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

      if (gitignore?.ignores(relativePath)) return;

      if (fs.statSync(filePath).isDirectory()) {
        walkDir(filePath);
      } else {
        // if (extensionFilter && path.extname(file) !== extensionFilter) return;
        if (!shouldIncludeFile(relativePath, file)) {
          return;
        }

        output.push(`__FILEPATH__${relativePath}__\n`);
        const fileContent = fs.readFileSync(filePath).toString("utf-8");
        const newOrModifiedRanges = newOrModifiedRangeMap?.[relativePath];
        const lines = fileContent.split("\n");
        if (newOrModifiedRanges) {
          lines.forEach((line, index) => {
            const lineNumber = index + 1;
            if (newOrModifiedRanges.some(({ start }) => lineNumber === start)) {
              output.push(`__START_MODIFIED_LINES__\n`);
            }
            output.push(line);
            if (index < lines.length - 1) {
              output.push("\n");
            }
            if (newOrModifiedRanges.some(({ end }) => lineNumber === end)) {
              output.push(`__END_MODIFIED_LINES__\n`);
            }
          });
        } else {
          output.push(fileContent);
        }
        const lineLength = lines.length - (fileContent.endsWith("\n") ? 1 : 0);
        lineLengthMap[relativePath] = lineLength;
      }
    });
  };

  if (includesExistingFiles) {
    walkDir(rootDir);
  }

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
  const result = [];

  for (let i = 0; i < sections.length - 1; i += 2) {
    const filePath = sections[i]!;
    let fileContent = sections[i + 1]!;
    const targetPath = path.join(outputPath, filePath);

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    // if the first line in file content starts with _, remove it
    // keep doing this until the first line doesn't start with _
    while (
      fileContent?.length > 0 &&
      fileContent?.split("\n")[0]?.startsWith("_")
    ) {
      fileContent = fileContent.split("\n").slice(1).join("\n");
    }

    // if the code is wrapped in a code block, remove the code block
    fileContent = removeMarkdownCodeblocks(fileContent);
    fs.writeFileSync(targetPath, fileContent);
    result.push({
      fileName: filePath,
      filePath: outputPath,
      codeBlock: fileContent,
    });
  }
  return result;
};

export interface CodeComment {
  path: string;
  body: string;
  line: number;
}

export const extractPRCommentsFromFiles = (concatFileContent: string) => {
  const sections = concatFileContent.split(/__FILEPATH__(.*?)__\n/).slice(1);

  const comments: CodeComment[] = [];

  for (let i = 0; i < sections.length - 1; i += 2) {
    const path = sections[i]!;
    const fileContent = sections[i + 1]!;
    const lines = fileContent.split("\n");

    let lineNumber = 0;
    let currentComment: string | undefined;
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (currentComment !== undefined) {
        if (trimmedLine === "__COMMENT_END__") {
          comments.push({ body: currentComment, line: lineNumber, path });
          currentComment = undefined;
        } else {
          currentComment = currentComment ? `${currentComment}\n${line}` : line;
        }
        continue;
      } else if (trimmedLine === "__COMMENT_START__") {
        currentComment = "";
        continue;
      } else if (
        trimmedLine === "__START_MODIFIED_LINES__" ||
        trimmedLine === "__END_MODIFIED_LINES__"
      ) {
        continue;
      } else {
        lineNumber++;
      }
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
    const existingRanges = rangeMap[file.to];
    if (!existingRanges) {
      rangeMap[file.to] = ranges;
    } else {
      existingRanges.push(...ranges);
    }
  });
  return rangeMap;
}

export interface FileContent {
  fileName: string;
  filePath: string;
  codeBlock: string;
}

export function applyCodePatch(rootPath: string, patch: string) {
  const files: FileContent[] = [];
  return new Promise<FileContent[]>((resolve, reject) => {
    applyPatches(patch, {
      loadFile: (index, callback) => {
        if (!index.oldFileName) {
          return callback(new Error("oldFileName is required"), "");
        }
        const data = fs
          .readFileSync(path.join(rootPath, index.oldFileName))
          .toString();
        callback(null, data);
      },
      patched: (index, content, callback) => {
        if (!index.newFileName) {
          return callback(new Error("newFileName is required"));
        }
        fs.writeFileSync(path.join(rootPath, index.newFileName), content);
        files.push({
          fileName: path.basename(index.newFileName),
          filePath: index.newFileName,
          codeBlock: content,
        });
        callback(null);
      },
      complete: (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(files);
        }
      },
    });
  });
}

const exec = promisify(execCallback);

const isTextFile = async (filePath: string): Promise<boolean> => {
  try {
    const { stdout } = await exec(
      `file --mime-type -b "${filePath.replace(/(["\s'$`\\])/g, "\\$1")}"`,
    );
    return stdout.startsWith("text/");
  } catch (error) {
    console.error("Error checking file type:", error);
    return false;
  }
};

const walkDir = async (
  dir: string,
  rootDir: string,
  callback: (filePath: string) => Promise<void>,
  gitignore: Ignore | null,
) => {
  try {
    const files = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const file of files) {
      const filepath = path.join(dir, file.name);
      const relativePath = path.relative(rootDir, filepath);

      if (gitignore?.ignores(relativePath)) continue;

      if (file.isDirectory()) {
        await walkDir(filepath, rootDir, callback, gitignore);
      } else {
        if (await isTextFile(filepath)) {
          await callback(filepath);
        }
      }
    }
  } catch (error) {
    console.error("Error walking directory:", error);
  }
};

export const getCodebase = async (rootDir: string): Promise<string> => {
  let contentToWrite = "";
  let gitignore: Ignore | null = null;
  const gitignorePath = path.join(rootDir, ".gitignore");
  try {
    fs.accessSync(gitignorePath, fs.constants.F_OK);
    let gitignoreContent = fs.readFileSync(gitignorePath).toString();
    // ignore any irrelevant files and binary files
    gitignoreContent +=
      "\n.*\npackage-lock.json\nyarn.lock\n*.png\n*.jpg\n*.jpeg\n*.gif\n*.ico\n*.svg\n*.webp\n*.bmp\n*.tiff\n*.tif\n*.heic\n*.heif\n*.avif\n*.pdf\n*.doc\n*.docx\n*.ppt\n*.pptx\n*.xls\n*.xlsx\n*.csv\n*.mp3\n*.mp4\n*.mov\n*.avi\n*.mkv\n*.webm\n*.wav\n*.flac\n*.ogg\n*.mpg\n*.mpeg\n*.wmv\n*.flv\n*.m4v\n*.3gp\n*.3g2\n*.aac\n*.wma\n*.flv\n*.m4a\n*.opus\n*.weba\n*.oga\n*.ogv\n*.ogm\n*.ogx\n*.ogx\n*.ogv";
    gitignore = ignore().add(gitignoreContent);
  } catch (err) {
    console.log("There is no gitignore or it is not accessible.");
  }

  await walkDir(
    rootDir,
    rootDir,
    async (filePath) => {
      const relativePath = path.relative(rootDir, filePath);
      contentToWrite += `File: ${relativePath}\n`;
      // const fileContent = addLineNumbers(
      //   await fs.promises.readFile(filePath, "utf-8"),
      // );
      const fileContent = await fs.promises.readFile(filePath, "utf-8");
      contentToWrite += fileContent + "\n";
    },
    gitignore,
  );
  // get the length of the contentToWrite file. If it's more than 2 million characters, truncate it.
  const maxLength = 2000000;
  if (contentToWrite.length > maxLength) {
    contentToWrite = contentToWrite.slice(0, maxLength);
  }

  return contentToWrite;
};

export const addLineNumbers = (fileContent: string): string => {
  if (!fileContent) {
    return "";
  }
  const lines = fileContent.split("\n");
  const numberedLines = lines.map((line, index) => `${index + 1}| ${line}`);
  return numberedLines.join("\n");
};

export const removeLineNumbers = (numberedContent: string): string => {
  if (!numberedContent) {
    return "";
  }
  const lines = numberedContent.split("\n");
  const originalLines = lines.map((line) =>
    line.replace(/^\d+\|\s?$/, "").replace(/^\d+\|\s/, ""),
  );
  return originalLines.join("\n");
};

export type StandardizedPath = string & { __brand: "StandardizedPath" };

function isValidPath(path: string): boolean {
  return /^\/[a-zA-Z0-9_\-./]+$/.test(path);
}

export function standardizePath(filePath: string): StandardizedPath {
  let cleanPath = filePath.replace(/^\.\//, "");

  if (!cleanPath.startsWith("/")) {
    cleanPath = "/" + cleanPath;
  }

  cleanPath = path.posix.normalize(cleanPath);
  cleanPath = cleanPath.replace(/\\/g, "/");

  if (!isValidPath(cleanPath)) {
    throw new Error(`Invalid file path: ${filePath}`);
  }

  return cleanPath as StandardizedPath;
}
