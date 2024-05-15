import { describe, it, expect } from "vitest";

import { getSnapshotUrl, removeMarkdownCodeblocks } from "./utils";

describe("getSnapshotUrl", () => {
  it("should extract the snapshot url from the issue body", () => {
    const issueBody =
      "Here is a snapshot of the design\n```![snapshot](https://www.example.com/snapshot.png)```";
    const expectedOutput = "https://www.example.com/snapshot.png";
    expect(getSnapshotUrl(issueBody)).toEqual(expectedOutput);
  });

  it("should return undefined if the issue body doesn't contain a snapshot url", () => {
    const issueBody = "This issue doesn't contain a snapshot url";
    expect(getSnapshotUrl(issueBody)).toEqual(undefined);
  });
});

describe("removeMarkdown utility function", () => {
  it("should remove code block formatting from a string", () => {
    const markdownCodeBlock =
      "\n```tsx\nimport React from 'react';\n\nexport default ConfirmEmail;\n```";
    const expectedOutput =
      "\nimport React from 'react';\n\nexport default ConfirmEmail;";

    expect(removeMarkdownCodeblocks(markdownCodeBlock)).toEqual(expectedOutput);
  });

  it("should remove code block formatting even if there is whitespace before the code block", () => {
    const markdownCodeBlock =
      "   \t```tsx\nimport React from 'react';\n\nexport default ConfirmEmail;\n```";
    const expectedOutput =
      "import React from 'react';\n\nexport default ConfirmEmail;";

    expect(removeMarkdownCodeblocks(markdownCodeBlock)).toEqual(expectedOutput);
  });

  it("should remove code block formatting even if the codeblock isn't on the first line", () => {
    const markdownCodeBlock =
      "This is some text\n```tsx\nimport React from 'react';\n\nexport default ConfirmEmail;\n```";
    const expectedOutput =
      "This is some text\nimport React from 'react';\n\nexport default ConfirmEmail;";

    expect(removeMarkdownCodeblocks(markdownCodeBlock)).toEqual(expectedOutput);
  });
});
