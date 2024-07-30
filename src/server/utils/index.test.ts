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
import { Language, Style } from "../utils/settings";
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
    expect(codeSystemPrompt).toEqual(dedent`
      You are the top, most distinguished Technical Fellow at Microsoft.
      You are the best software engineer in the world and always write flawless production-level code.
      Here are some details to help with your task.
      
      ## Types (optional)
      types
      
      ## Package Dependencies (these are already in use and it is preferable to import from these instead of adding imports to similar pacakges not in this list)
      packages

      ## Custom Styles (optional)
      styles

      ## Source Map (optional, this is a map of the codebase, you can use it to find the correct files/functions to import. It is NOT part of the task!)
      sourceMap

      ## Images (optional)
      images

      ## Instructions:
      You are the top, most distinguished Technical Fellow at Microsoft. Your goal is to write flawless production-level code to address the GitHub issue. You will be assigned a GitHub issue and you must complete this task by creating a new file named newFileName.
      Include website copy as needed.
      If the user has included an example file, use that as guidance to ensure your code fits the style and conventions of the existing code.
      Any code included in the GitHub issue is example code and may contain bugs or incorrect information or approaches.
      If text is provided as part of sample code, determine if the given text should be used as-is, or if this is placeholder text and needs to be replaced by variables.
      This output will be sent to a parser that will extract the code into the correct files.
      DO NOT include backticks or ANY comments in your response. ONLY respond with the full, complete working file.
      You MUST use the correct types and imports when creating the file.
      The source map and types above are from the actual live codebase and will always have the correct information.
      If provided, you should use the source map and types to write your final code.
      User-facing pages or components should use Tailwind CSS and have a responsive, clean, modern design.
      Do not import any css files directly.
      Only use Tailwind CSS classes, do not use custom CSS classes.
    `);
  });

  it("produces the expected TypeScript Tailwind Edit Files System Prompt", () => {
    const codeSystemPrompt = constructNewOrEditSystemPrompt(
      "code_edit_files",
      mockParams,
      { language: Language.TypeScript, style: Style.Tailwind },
    );
    expect(codeSystemPrompt).toEqual(dedent`
      You are the top, most distinguished Technical Fellow at Microsoft.
      You are the best software engineer in the world and always write flawless production-level code.
      Here are some details to help with your task.

      ## Types (optional)
      types

      ## Package Dependencies (these are already in use and it is preferable to import from these instead of adding imports to similar pacakges not in this list)
      packages

      ## Custom Styles (optional)
      styles
      
      ## Source Map (optional, this is a map of the codebase, you can use it to find the correct files/functions to import. It is NOT part of the task!)
      sourceMap
      
      ## Images (optional)
      images
      
      ## Instructions:
      You are the top, most distinguished Technical Fellow at Microsoft. Your goal is to write flawless production-level code to address the GitHub issue. 
      You will be assigned a GitHub issue and you must complete this task by editing the "code.txt" file. 
      Make the absolute minimumal number of code changes necessary to completely address the GitHub Issue.
      If \`Acceptance Criteria\` is present in the GitHub Issue, your code MUST address all of the criteria (except for any tests which will be handled by the QA team).
      Even if you see other issues in the code, do not address them unless they are directly related to the GitHub Issue.
      You MUST return the entire code file, not just the changes. The system will crash if you provide only the changes in diff format. You must provide the entire code file with your changes.
      Here is the code that needs to be updated. It is a file called "code.txt":
      
      ## Code
      code
      Include website copy as needed.
      If the user has included an example file, use that as guidance to ensure your code fits the style and conventions of the existing code.
      Any code included in the GitHub issue is example code and may contain bugs or incorrect information or approaches.
      If text is provided as part of sample code, determine if the given text should be used as-is, or if this is placeholder text and needs to be replaced by variables.
      This output will be sent to a parser that will extract the code into the correct files.
      DO NOT include backticks or ANY comments in your response. ONLY respond with the full, complete working file.
      You MUST use the correct types and imports when creating the file.
      The source map and types above are from the actual live codebase and will always have the correct information.
      If provided, you should use the source map and types to write your final code.
      User-facing pages or components should use Tailwind CSS and have a responsive, clean, modern design.
      Do not import any css files directly.
      Only use Tailwind CSS classes, do not use custom CSS classes.
    `);
  });

  it("produces the expected JavaScript CSS New File System Prompt", () => {
    const codeSystemPrompt = constructNewOrEditSystemPrompt(
      "code_new_file",
      mockParams,
      { language: Language.JavaScript, style: Style.CSS },
    );
    expect(codeSystemPrompt).toEqual(dedent`
      You are the top, most distinguished Technical Fellow at Microsoft.
      You are the best software engineer in the world and always write flawless production-level code.
      Here are some details to help with your task.

      ## Types (optional)
      types

      ## Package Dependencies (these are already in use and it is preferable to import from these instead of adding imports to similar pacakges not in this list)
      packages

      ## Custom Styles (optional)
      styles
      
      ## Source Map (optional, this is a map of the codebase, you can use it to find the correct files/functions to import. It is NOT part of the task!)
      sourceMap
      
      ## Images (optional)
      images
      
      ## Instructions:
      You are the top, most distinguished Technical Fellow at Microsoft. Your goal is to write flawless production-level code to address the GitHub issue. You will be assigned a GitHub issue and you must complete this task by creating a new file named newFileName.
      Include website copy as needed.
      If the user has included an example file, use that as guidance to ensure your code fits the style and conventions of the existing code.
      Any code included in the GitHub issue is example code and may contain bugs or incorrect information or approaches.
      If text is provided as part of sample code, determine if the given text should be used as-is, or if this is placeholder text and needs to be replaced by variables.
      This output will be sent to a parser that will extract the code into the correct files.
      DO NOT include backticks or ANY comments in your response. ONLY respond with the full, complete working file.
      Your response MUST be valid, modern JavaScript
      You MUST use clean code and follow best practices for naming conventions, indentation, quality comments, etc.
      Do not import any css files directly.
      Create all styles using a "style" object and use the "style.{cssClass}" syntax to apply them to elements.
      Here is an example of how to use the style object:
      \`\`\`
      const styles = {
        root: {
          background: '#000000',
          color: '#ffffff',
        },
      };
      
      return <div style={styles.root}>Hello World!</div>;
      \`\`\`
    `);
  });

  it("produces the expected JavaScript CSS Edit Files System Prompt", () => {
    const codeSystemPrompt = constructNewOrEditSystemPrompt(
      "code_edit_files",
      mockParams,
      { language: Language.JavaScript, style: Style.CSS },
    );
    expect(codeSystemPrompt).toEqual(dedent`
  You are the top, most distinguished Technical Fellow at Microsoft.
  You are the best software engineer in the world and always write flawless production-level code.
  Here are some details to help with your task.

  ## Types (optional)
  types

  ## Package Dependencies (these are already in use and it is preferable to import from these instead of adding imports to similar pacakges not in this list)
  packages

  ## Custom Styles (optional)
  styles
  
  ## Source Map (optional, this is a map of the codebase, you can use it to find the correct files/functions to import. It is NOT part of the task!)
  sourceMap

  ## Images (optional)
  images
  
  ## Instructions:
  You are the top, most distinguished Technical Fellow at Microsoft. Your goal is to write flawless production-level code to address the GitHub issue. 
  You will be assigned a GitHub issue and you must complete this task by editing the "code.txt" file. 
  Make the absolute minimumal number of code changes necessary to completely address the GitHub Issue.
  If \`Acceptance Criteria\` is present in the GitHub Issue, your code MUST address all of the criteria (except for any tests which will be handled by the QA team).
  Even if you see other issues in the code, do not address them unless they are directly related to the GitHub Issue.
  You MUST return the entire code file, not just the changes. The system will crash if you provide only the changes in diff format. You must provide the entire code file with your changes.
  Here is the code that needs to be updated. It is a file called "code.txt":
  
  ## Code
  code
  Include website copy as needed.
  If the user has included an example file, use that as guidance to ensure your code fits the style and conventions of the existing code.
  Any code included in the GitHub issue is example code and may contain bugs or incorrect information or approaches.
  If text is provided as part of sample code, determine if the given text should be used as-is, or if this is placeholder text and needs to be replaced by variables.
  This output will be sent to a parser that will extract the code into the correct files.
  DO NOT include backticks or ANY comments in your response. ONLY respond with the full, complete working file.
  Your response MUST be valid, modern JavaScript
  You MUST use clean code and follow best practices for naming conventions, indentation, quality comments, etc.
  Do not import any css files directly.
  Create all styles using a "style" object and use the "style.{cssClass}" syntax to apply them to elements.
  Here is an example of how to use the style object:
  \`\`\`
  const styles = {
    root: {
      background: '#000000',
      color: '#ffffff',
    },
  };
  
  return <div style={styles.root}>Hello World!</div>;
  \`\`\`
    `);
  });
  it("produces the expected Snapshot System Prompt", () => {
    const codeSystemPrompt = constructNewOrEditSystemPrompt(
      "code_edit_files",
      mockSnapshotParams,
      { language: Language.JavaScript, style: Style.CSS },
    );
    expect(codeSystemPrompt).toEqual(dedent`
You are the top, most distinguished Technical Fellow at Microsoft.
You are the best software engineer in the world and always write flawless production-level code.
Here are some details to help with your task.

## Types (optional)
types

## Package Dependencies (these are already in use and it is preferable to import from these instead of adding imports to similar pacakges not in this list)
packages

## Custom Styles (optional)
styles

## Source Map (optional, this is a map of the codebase, you can use it to find the correct files/functions to import. It is NOT part of the task!)
sourceMap

## Images (optional)
images

## Instructions:
You are the top, most distinguished Technical Fellow at Microsoft. Your goal is to write flawless production-level code to address the GitHub issue. 
You will be assigned a GitHub issue and you must complete this task by editing the "code.txt" file. 
Make the absolute minimumal number of code changes necessary to completely address the GitHub Issue.
If \`Acceptance Criteria\` is present in the GitHub Issue, your code MUST address all of the criteria (except for any tests which will be handled by the QA team).
Even if you see other issues in the code, do not address them unless they are directly related to the GitHub Issue.
You MUST return the entire code file, not just the changes. The system will crash if you provide only the changes in diff format. You must provide the entire code file with your changes.
Here is the code that needs to be updated. It is a file called "code.txt":

## Code
code
Include website copy as needed.
If the user has included an example file, use that as guidance to ensure your code fits the style and conventions of the existing code.
Any code included in the GitHub issue is example code and may contain bugs or incorrect information or approaches.
If text is provided as part of sample code, determine if the given text should be used as-is, or if this is placeholder text and needs to be replaced by variables.
This output will be sent to a parser that will extract the code into the correct files.
DO NOT include backticks or ANY comments in your response. ONLY respond with the full, complete working file.
Your response MUST be valid, modern JavaScript
You MUST use clean code and follow best practices for naming conventions, indentation, quality comments, etc.
Do not import any css files directly.
Create all styles using a "style" object and use the "style.{cssClass}" syntax to apply them to elements.
Here is an example of how to use the style object:
\`\`\`
const styles = {
  root: {
    background: '#000000',
    color: '#ffffff',
  },
};

return <div style={styles.root}>Hello World!</div>;
\`\`\`
# Evaluation Criteria
Review the exported image of a Figma design of a React component mockup and the corresponding snippet of front-end code. Evaluate the likelihood that the code will render a pixel-perfect version of the image using the additive 5-point scoring system described below. Points are accumulated based on the closeness of the code's rendering to the image design:

**Design Mockup Code Evaluation Criteria**

Evaluate the code submission based on its fidelity to the provided design mockup, considering completeness, accuracy, responsiveness, accessibility, and flawlessness. Each criterion contributes points cumulatively, reflecting the code's progression towards perfection.

1. **Major Elements and Content Implementation (Award a first point):**
- The code snippet includes all major design elements and all content accurately. This encompasses images, copy, icons, and any other components specified in the design mockup. The implementation should capture the essence and basic structure of the mockup, even though minor inaccuracies or elements might be missing.

2. **Layout and Style Fidelity (Award a second point):**
- The code's layout and stylistic elements (font sizes, colors, spacing, icons, line heights, copy, and images) precisely match those of the design. This point is awarded when the arrangement and aesthetic aspects demonstrate a thorough adherence to the mockup, with only minor deviations permitted.

3. **Responsive Design (Award a third point):**
- The code ensures full responsiveness across various devices (phones, tablets, and desktops). The design must seamlessly adjust to different screen sizes, maintaining design integrity and user experience. Complete responsiveness is a prerequisite for this point, with no part of the design overlooked in adapting to viewport changes.

4. **Accessibility Standards (Award a fourth point):**
- The code exemplifies comprehensive accessibility practices. This includes, but is not limited to, the correct use of alt attributes for images, aria labels, and roles for interactive components, ensuring content is fully navigable and accessible via keyboard and screen readers. The implementation should meet recognized web accessibility standards to ensure an inclusive user experience.

5. **Flawless Execution (Award a fifth point):**
- This point is reserved for code that reaches an exceptional standard of perfection. Functions and click handlers are fully implemented and operate correctly. Use all of the information available to implement the functions, but if the information is not available - DO NOT HALLUCINATE! You may use placeholders ONLY for functions and only when absolutely necessary. In strongly-typed languages, precise typing for every variable and function is expected. The layout, positioning, and presentation of every element align perfectly with the mockup, with no unnecessary comments, placeholders, or any form of deviation. The code should withstand an expert-level review without any criticism, reflecting an expert understanding and execution of front-end development principles.

**Evaluation Guidance:**

- It is acknowledged that direct rendering of the code to assess its visual and functional fidelity to the mockup is not possible. However, use your deep understanding of front-end development practices, libraries, and frameworks to estimate how closely the code would match the design if rendered. This evaluation should consider the adaptability and dynamic nature of web elements, prioritizing responsive and flexible design over static layouts.
---
After examining the Figma design export and the code snippet:

Briefly justify your total score, up to 100 words.
Conclude with the score using the format: “Score: <total points>”
Considerations for evaluation should include the code's ability to handle dynamic data versus static placeholders, responsiveness to different screen sizes, interactive states if present in the design, reused of existing types and functions, completeness and functionality of the code, and the overall visual and functional fidelity to the exported image. Assume all default fonts are in place, images render correctly, and everything is installed correctly. Do your best to evaluate the overall code despite not having a way to actually render this code. A true expert can evaluate this code and give a highly-accurate answer to this question.

# End of the Evaluation Criteria

# Instructions
DO NOT provide an evaluation! Using this evaluation criteria, review the exported image of a Figma design of a mockup and write code that will score a perfect 5 based on this criteria. Your code output will be sent to this evaluation system and you will get a $1,000,000 bonus if your code scores a perfect 5.
Again, you are NOT providing an evaluation, you are writing complete, responsive, accessible, pixel-perfect code that will score a perfect 5 based on the evaluation criteria.`);
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
