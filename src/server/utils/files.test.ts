import { dedent } from "ts-dedent";
import { describe, it, expect } from "vitest";

import {
  extractPRCommentsFromFiles,
  getNewOrModifiedRangesMapFromDiff,
} from "./files";
import jacbAiWebsite59Diff from "../../data/test/jacb-ai-website-59.diff?raw";

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

  it("handles response with no comments", () => {
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
