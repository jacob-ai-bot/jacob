import * as dotenv from "dotenv";
import { dedent } from "ts-dedent";
import {
  vi,
  describe,
  test,
  beforeEach,
  afterEach,
  afterAll,
  it,
  expect,
} from "vitest";
import fs from "fs";

import {
  constructNewOrEditSystemPrompt,
  type TemplateParams,
  getStyles,
  rethrowErrorWithTokenRedacted,
  type ExecAsyncException,
} from "../utils";
import { Language } from "~/types";
import { Style } from "../utils/settings";
import { TestExecAsyncException } from "~/server/utils/testHelpers";

dotenv.config();
const originalPromptsFolder = process.env.PROMPT_FOLDER ?? "src/server/prompts";

describe("constructNewOrEditSystemPrompt", () => {
  const mockParams: TemplateParams = {
    types: "types",
    packages: "packages",
    sourceMap: "sourceMap",
    styles: "styles",
    images: "images",
    newFileName: "newFileName",
    code: "code",
  };

  const mockSnapshotParams: TemplateParams = {
    ...mockParams,
    snapshotUrl: "https://www.example.com/snapshot.png",
  };

  beforeEach(() => {
    process.env.PROMPT_FOLDER = originalPromptsFolder;
  });

  afterEach(() => {
    delete process.env.PROMPT_FOLDER;
  });

  it("produces the expected TypeScript Tailwind New File System Prompt", () => {
    const codeSystemPrompt = constructNewOrEditSystemPrompt(
      "code_new_file",
      mockParams,
      { language: Language.TypeScript, style: Style.Tailwind },
    );
    expect(codeSystemPrompt).toContain(
      "You are the top, most distinguished Technical Fellow at Microsoft.",
    );
    expect(codeSystemPrompt).toContain("## Source Map");
    expect(codeSystemPrompt).toContain("## Instructions:");
  });

  it("produces the expected TypeScript Tailwind Edit Files System Prompt", () => {
    const codeSystemPrompt = constructNewOrEditSystemPrompt(
      "code_edit_files",
      mockParams,
      { language: Language.TypeScript, style: Style.Tailwind },
    );
    expect(codeSystemPrompt).toContain(
      "You are the top, most distinguished Technical Fellow at Microsoft.",
    );
    expect(codeSystemPrompt).toContain("## Source Map");
    expect(codeSystemPrompt).toContain("## Code");
  });

  it("produces the expected JavaScript CSS New File System Prompt", () => {
    const codeSystemPrompt = constructNewOrEditSystemPrompt(
      "code_new_file",
      mockParams,
      { language: Language.JavaScript, style: Style.CSS },
    );
    expect(codeSystemPrompt).toContain(
      "You are the top, most distinguished Technical Fellow at Microsoft.",
    );
    expect(codeSystemPrompt).toContain("## Custom Styles");
    expect(codeSystemPrompt).toContain("## Instructions:");
  });

  it("produces the expected JavaScript CSS Edit Files System Prompt", () => {
    const codeSystemPrompt = constructNewOrEditSystemPrompt(
      "code_edit_files",
      mockParams,
      { language: Language.JavaScript, style: Style.CSS },
    );
    expect(codeSystemPrompt).toContain(
      "You are the top, most distinguished Technical Fellow at Microsoft.",
    );
    expect(codeSystemPrompt).toContain("## Custom Styles");
    expect(codeSystemPrompt).toContain("## Code");
  });

  it("produces the expected Snapshot System Prompt", () => {
    const codeSystemPrompt = constructNewOrEditSystemPrompt(
      "code_edit_files",
      mockSnapshotParams,
      { language: Language.JavaScript, style: Style.CSS },
    );
    expect(codeSystemPrompt).toContain(
      "You are the top, most distinguished Technical Fellow at Microsoft.",
    );
    expect(codeSystemPrompt).toContain("## Images");
    expect(codeSystemPrompt).toContain("# Evaluation Criteria");
  });
});

describe("getStyles", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("returns the tailwind config contents", async () => {
    vi.spyOn(fs, "existsSync").mockImplementation(
      (path) =>
        path === "/rootpath/tailwind.config.ts" ||
        path === "/rootpath/tailwind.config.js" ||
        path === "/rootpath/custom/tailwind.config.ts",
    );
    vi.spyOn(fs.promises, "readFile").mockImplementation(
      (path) =>
        new Promise((resolve, reject) => {
          if (path === "/rootpath/tailwind.config.ts") {
            resolve("tailwind config typescript");
          } else if (path === "/rootpath/tailwind.config.js") {
            resolve("tailwind config javascript");
          } else if (path === "/rootpath/custom/tailwind.config.ts") {
            resolve("custom path config contents");
          } else {
            reject(new Error("File not found"));
          }
        }),
    );

    const resultNoSettings = await getStyles("/rootpath");
    expect(resultNoSettings).toBe("tailwind config typescript");

    const resultTailwind = await getStyles("/rootpath", {
      language: Language.TypeScript,
      style: Style.Tailwind,
    });
    expect(resultTailwind).toBe("tailwind config typescript");

    const resultTypeScript = await getStyles("/rootpath", {
      language: Language.TypeScript,
    });
    expect(resultTypeScript).toBe("tailwind config typescript");

    const resultCustomPath = await getStyles("/rootpath", {
      language: Language.TypeScript,
      directories: { tailwindConfig: "custom/tailwind.config.ts" },
    });
    expect(resultCustomPath).toBe("custom path config contents");

    const resultCSS = await getStyles("/rootpath", {
      language: Language.TypeScript,
      style: Style.CSS,
    });
    expect(resultCSS).toBe("");

    const resultJavaScript = await getStyles("/rootpath", {
      language: Language.JavaScript,
    });
    expect(resultJavaScript).toBe("tailwind config javascript");
  });
});

describe("rethrowErrorWithTokenRedacted", () => {
  test("git clone style error", () => {
    const error = new TestExecAsyncException(
      "Command failed: git clone  https://x-access-token:my-token@github.com/organization/repo-name.git .",
      dedent`
              Cloning into '.'...
              fatal: the remote end hung up unexpectedly
              fatal: early EOF
              fatal: index-pack failed
            `,
      "",
    );

    let errorString = "";
    try {
      rethrowErrorWithTokenRedacted(error, "my-token");
    } catch (error) {
      errorString = (error as Error).toString();
    }
    expect(errorString).not.toContain("my-token");
    expect(errorString).toBe(
      "Error: Command failed: git clone  https://x-access-token:<redacted>@github.com/organization/repo-name.git .",
    );
  });

  test("git commit style error", () => {
    const stderrText = dedent`
      To https://github.com/kleneway/jacob.git
      ! [rejected]        jacob-issue-1-1717533860017 -> jacob-issue-1-1717533860017 (fetch first)
      error: failed to push some refs to 'https://x-access-token:my-token@github.com/kleneway/jacob.git'
      hint: Updates were rejected because the remote contains work that you do
      hint: not have locally. This is usually caused by another repository pushing
      hint: to the same ref. You may want to first integrate the remote changes
      hint: (e.g., 'git pull ...') before pushing again.
      hint: See the 'Note about fast-forwards' in 'git push --help' for details.
    `;
    const error = new TestExecAsyncException(
      "Command failed: git push --set-upstream origin jacob-issue-1-1717533860017",
      "",
      stderrText,
    );

    let errorString = "";
    let savedError;
    try {
      rethrowErrorWithTokenRedacted(error, "my-token");
    } catch (error) {
      errorString = (error as Error).toString();
      savedError = error;
    }
    expect(errorString).not.toContain("my-token");
    expect(errorString).toBe(
      "Error: Command failed: git push --set-upstream origin jacob-issue-1-1717533860017",
    );
    expect((savedError as ExecAsyncException).stdout).toBe("");
    expect((savedError as ExecAsyncException).stderr).toBe(
      stderrText.replace("my-token", "<redacted>"),
    );
  });
});
