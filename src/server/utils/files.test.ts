import { dedent } from "ts-dedent";
import { describe, it, expect } from "vitest";

import { extractPRCommentsFromFiles } from "./files";

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
});
