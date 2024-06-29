import { dedent } from "ts-dedent";
import { vi, describe, it, expect, afterEach } from "vitest";
import fs, { type Stats, type Dirent } from "fs";

import {
  concatenateFiles,
  extractPRCommentsFromFiles,
  getNewOrModifiedRangesMapFromDiff,
  applyCodePatch,
} from "./files";

import jacbAiWebsite59Diff from "../../data/test/jacb-ai-website-59.diff?raw";
import test001 from "../../data/test/diff/test001.txt?raw";
import test002 from "../../data/test/diff/test002.txt?raw";
import test001Diff from "../../data/test/diff/test001.diff?raw";

describe("extractPRCommentsFromFiles", () => {
  it("handles response with no comments", () => {
    const contentWithNoComments = dedent`
    __FILEPATH__file1.js__
    console.log("file1");
    __FILEPATH__file2.js__
    console.log("file2");
  `;

    const fileComments = extractPRCommentsFromFiles(contentWithNoComments);
    expect(fileComments).toStrictEqual([]);
  });

  it("handles response with a simple comment", () => {
    const contentWithSimpleComment = dedent`
    __FILEPATH__file1.js__
    console.log("file1");
    __COMMENT_START__
    This console.log() statement is unnecessary.
    __COMMENT_END__
    __FILEPATH__file2.js__
    console.log("file2");
  `;

    const fileComments = extractPRCommentsFromFiles(contentWithSimpleComment);
    expect(fileComments).toStrictEqual([
      {
        path: "file1.js",
        body: "This console.log() statement is unnecessary.",
        line: 1,
      },
    ]);
  });

  it("doesn't include modified line markers in line numbers", () => {
    const contentWithSimpleComment = dedent`
    __FILEPATH__file1.js__
    console.log("file1");
    __START_MODIFIED_LINES__
    __COMMENT_START__
    This console.log() statement is unnecessary.
    __COMMENT_END__
    __END_MODIFIED_LINES__
    __FILEPATH__file2.js__
    console.log("file2");
  `;

    const fileComments = extractPRCommentsFromFiles(contentWithSimpleComment);
    expect(fileComments).toStrictEqual([
      {
        path: "file1.js",
        body: "This console.log() statement is unnecessary.",
        line: 1,
      },
    ]);
  });

  it("handles response with comment after the last line", () => {
    const contentWithNoComments = dedent`
    __FILEPATH__file1.js__
    console.log("file1");
    __FILEPATH__file2.js__
    console.log("file2");
    __COMMENT_START__
    This console.log() statement is unnecessary.
    __COMMENT_END__
  `;

    const fileComments = extractPRCommentsFromFiles(contentWithNoComments);
    expect(fileComments).toStrictEqual([
      {
        path: "file2.js",
        body: "This console.log() statement is unnecessary.",
        line: 1,
      },
    ]);
  });
});

describe("getNewOrModifiedRangesMapFromDiff", () => {
  it("process diff from PR with binary and code file", () => {
    const rangesMap = getNewOrModifiedRangesMapFromDiff(jacbAiWebsite59Diff);
    expect(rangesMap).toStrictEqual({
      "public/assets/images/8492a05cd3ca58619216d07a9542c5088836a3df.png": [],
      "src/pages/finished.tsx": [
        { start: 1, end: 1 },
        { start: 3, end: 4 },
        { start: 7, end: 8 },
        { start: 11, end: 12 },
        { start: 16, end: 21 },
        { start: 24, end: 28 },
        { start: 30, end: 36 },
        { start: 39, end: 50 },
        { start: 58, end: 58 },
      ],
    });
  });
});

describe("applyCodePatch", () => {
  it("applies a code patch", async () => {
    const readFileSpy = vi.spyOn(fs, "readFileSync").mockReturnValue(test001);
    const writeFileSpy = vi.spyOn(fs, "writeFileSync").mockReturnValue();

    await applyCodePatch("/rootpath", test001Diff);
    expect(readFileSpy).toHaveBeenCalledWith("/rootpath/test001.txt");
    expect(writeFileSpy).toHaveBeenCalledWith("/rootpath/test001.txt", test002);
  });
});

describe("concatenateFiles", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("concatenates files", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    vi.spyOn(fs, "statSync").mockReturnValue({
      isDirectory: () => false,
    } as Stats);
    vi.spyOn(fs, "readdirSync").mockReturnValue([
      "file1.js",
      "file2.js",
    ] as unknown as Dirent[]);
    vi.spyOn(fs, "readFileSync").mockReturnValue(
      Buffer.from(dedent`
        console.log("line1");
        console.log("line2");

      `),
    );

    const { code, lineLengthMap } = concatenateFiles("./", undefined, [
      "file1.js",
      "file2.js",
    ]);
    expect(code).toBe(
      dedent`
        __FILEPATH__file1.js__
        console.log("line1");
        console.log("line2");
        __FILEPATH__file2.js__
        console.log("line1");
        console.log("line2");

      `,
    );
    expect(lineLengthMap).toStrictEqual({ "file1.js": 2, "file2.js": 2 });
  });

  it("ignores existing files when not asked for, but leaves placeholders for new files", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    vi.spyOn(fs, "statSync").mockReturnValue({
      isDirectory: () => false,
    } as Stats);
    vi.spyOn(fs, "readdirSync").mockReturnValue([
      "file1.js",
      "file2.js",
    ] as unknown as Dirent[]);
    vi.spyOn(fs, "readFileSync").mockReturnValue(
      Buffer.from(dedent`
        console.log("line1");
        console.log("line2");

      `),
    );

    const { code, lineLengthMap } = concatenateFiles(
      "./",
      undefined,
      undefined,
      ["file3.js"],
    );
    expect(code).toBe(
      dedent`
        __FILEPATH__file3.js__

      `,
    );
    expect(lineLengthMap).toStrictEqual({});
  });

  it("concatenates files with modified range markers inserted", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    vi.spyOn(fs, "statSync").mockReturnValue({
      isDirectory: () => false,
    } as Stats);
    vi.spyOn(fs, "readdirSync").mockReturnValue([
      "file1.js",
      "file2.js",
    ] as unknown as Dirent[]);
    vi.spyOn(fs, "readFileSync").mockReturnValue(
      Buffer.from(dedent`
        console.log("line1");
        console.log("line2");
        console.log("line3");
        console.log("line4");

      `),
    );

    const { code, lineLengthMap } = concatenateFiles(
      "./",
      {
        "file1.js": [{ start: 1, end: 3 }],
        "file2.js": [
          { start: 2, end: 2 },
          { start: 4, end: 4 },
        ],
      },
      ["file1.js", "file2.js"],
    );
    expect(code).toBe(
      dedent`
        __FILEPATH__file1.js__
        __START_MODIFIED_LINES__
        console.log("line1");
        console.log("line2");
        console.log("line3");
        __END_MODIFIED_LINES__
        console.log("line4");
        __FILEPATH__file2.js__
        console.log("line1");
        __START_MODIFIED_LINES__
        console.log("line2");
        __END_MODIFIED_LINES__
        console.log("line3");
        __START_MODIFIED_LINES__
        console.log("line4");
        __END_MODIFIED_LINES__

      `,
    );
    expect(lineLengthMap).toStrictEqual({ "file1.js": 4, "file2.js": 4 });
  });
});
