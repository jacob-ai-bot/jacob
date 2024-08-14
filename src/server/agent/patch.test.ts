/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { describe, test, expect, afterEach, afterAll, vi } from "vitest";
import { dedent } from "ts-dedent";
import fs from "fs";

import { applyCodePatchViaLLM } from "./patch";

const mockedUtils = vi.hoisted(() => ({
  sendSelfConsistencyChainOfThoughtGptRequest: vi
    .fn()
    .mockResolvedValue("<file_content>file-content</file_content>"),
}));
vi.mock("~/server/openai/utils", () => mockedUtils);

describe("createNewFile", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  test("createNewFile new file - success", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    const writeFileSpy = vi
      .spyOn(fs, "writeFileSync")
      .mockReturnValue(undefined);

    const result = await applyCodePatchViaLLM(
      "/rootpath",
      "src/file.txt",
      "patch",
      true, // isNewFile
    );

    expect(result).toStrictEqual([
      {
        fileName: "file.txt",
        filePath: "src/file.txt",
        codeBlock: "file-content",
      },
    ]);

    expect(
      mockedUtils.sendSelfConsistencyChainOfThoughtGptRequest,
    ).toHaveBeenCalledOnce();
    expect(
      mockedUtils.sendSelfConsistencyChainOfThoughtGptRequest.mock.lastCall[0],
    ).toContain(
      "I want to create a new file with the following patch:\n\npatch",
    );
    expect(
      mockedUtils.sendSelfConsistencyChainOfThoughtGptRequest.mock.lastCall[1],
    ).toContain(
      "You are an expert code creator. Your task is to generate the complete file content based on the given patch for a new file.",
    );

    expect(writeFileSpy).toHaveBeenCalledOnce();
    expect(writeFileSpy).toHaveBeenLastCalledWith(
      "/rootpath/src/file.txt",
      "file-content",
      "utf-8",
    );
  });

  test("createNewFile existing file - success", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue("line1\nline2");
    const writeFileSpy = vi
      .spyOn(fs, "writeFileSync")
      .mockReturnValue(undefined);

    mockedUtils.sendSelfConsistencyChainOfThoughtGptRequest
      .mockResolvedValueOnce(dedent`
        <file_content>
        1| modified-line1
        2| modified-line2
        </file_content>
      `);

    const result = await applyCodePatchViaLLM(
      "/rootpath",
      "src/file.txt",
      "patch",
      false, // isNewFile
    );

    expect(result).toStrictEqual([
      {
        fileName: "file.txt",
        filePath: "src/file.txt",
        codeBlock: dedent`
          modified-line1
          modified-line2
        `,
      },
    ]);

    expect(
      mockedUtils.sendSelfConsistencyChainOfThoughtGptRequest,
    ).toHaveBeenCalledOnce();
    expect(
      mockedUtils.sendSelfConsistencyChainOfThoughtGptRequest.mock.lastCall[0],
    ).toContain(dedent`
        I have an existing file with the following content (line numbers added for reference):

        1| line1
        2| line2

        I want to apply the following patch to this file:
      `);
    expect(
      mockedUtils.sendSelfConsistencyChainOfThoughtGptRequest.mock.lastCall[1],
    ).toContain(
      "You are an expert code editor. Your task is to apply the given patch to the existing file content and return the entire updated file content, including line numbers.",
    );

    expect(writeFileSpy).toHaveBeenCalledOnce();
    expect(writeFileSpy).toHaveBeenLastCalledWith(
      "/rootpath/src/file.txt",
      dedent`
        modified-line1
        modified-line2
      `,
      "utf-8",
    );
  });
});
