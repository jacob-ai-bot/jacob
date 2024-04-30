import { dedent } from "ts-dedent";
import {
  describe,
  test,
  expect,
  afterEach,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import { type Repository } from "@octokit/webhooks-types";
import fs from "fs";

import issuesOpenedNewFilePayload from "../../data/test/webhooks/issues.opened.newFile.json";
import { createStory, type PullRequest } from "./createStory";
import { type CheckAndCommitOptions } from "./checkAndCommit";
import { Language } from "../utils/settings";

const mockedRequest = vi.hoisted(() => ({
  sendGptVisionRequest: vi.fn().mockResolvedValue("storybook-story-code"),
}));
vi.mock("../openai/request", () => mockedRequest);

const mockedCheckAndCommit = vi.hoisted(() => ({
  checkAndCommit: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("./checkAndCommit", () => mockedCheckAndCommit);

const mockedFiles = vi.hoisted(() => ({
  saveNewFile: vi.fn().mockImplementation(() => undefined),
}));
vi.mock("../utils/files", () => mockedFiles);

const mockedEvents = vi.hoisted(() => ({
  emitCodeEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("~/server/utils/events", () => mockedEvents);

const mockedIssue = vi.hoisted(() => ({
  getIssue: vi.fn().mockImplementation(
    () =>
      new Promise((resolve) =>
        resolve({
          data: issuesOpenedNewFilePayload.issue,
        }),
      ),
  ),
  addCommentToIssue: vi
    .fn()
    .mockImplementation(() => new Promise((resolve) => resolve({}))),
}));
vi.mock("../github/issue", () => mockedIssue);

const mockedSourceMap = vi.hoisted(() => ({
  getTypes: vi.fn().mockImplementation(() => "types"),
}));
vi.mock("../analyze/sourceMap", () => mockedSourceMap);

const originalPromptsFolder = process.env.PROMPT_FOLDER ?? "src/server/prompts";

describe("createStory", () => {
  beforeEach(() => {
    process.env.PROMPT_FOLDER = originalPromptsFolder;
  });

  afterEach(() => {
    delete process.env.PROMPT_FOLDER;
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  test("createStory succeeds", async () => {
    const fsActual = await vi.importActual("fs");
    vi.spyOn(fs, "readFileSync").mockImplementation((file, options) => {
      if (typeof file === "string" && file.startsWith("/rootpath")) {
        return "component-code";
      }
      return (fsActual as typeof fs).readFileSync(file, options);
    });

    const mockEventData = {
      projectId: 1,
      repoFullName: "test-login/test-repo",
      userId: "test-user",
    };

    await createStory({
      ...mockEventData,
      repository: {
        owner: { login: "test-login" },
        name: "test-repo",
      } as Repository,
      token: "token",
      rootPath: "/rootpath",
      branch: "jacob-issue-48-test",
      existingPr: { number: 48 } as PullRequest,
    });

    expect(mockedRequest.sendGptVisionRequest).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const systemPrompt = mockedRequest.sendGptVisionRequest.mock.calls[0][1];
    expect(systemPrompt).toContain(dedent`
      Act as a L8 Principal TypeScript Software Engineer at Facebook and create a new storybook story named src/components/ProfileInformation.stories.tsx.
      Use the context and instructions below, along with the code provided by the user, to complete this task.
      
      -- Example Storybook Story
      \`\`\`
      // The code for the Button component:
      // import React from "react";

      // interface ButtonProps {
    `);
    expect(systemPrompt).toContain(dedent`
      -- Types (optional)
      types

    `);
    expect(systemPrompt).toContain(dedent`
      -- Instructions:
      The user will provide a working src/components/ProfileInformation.tsx file and you will need to create a storybook story that renders the src/components/ProfileInformation.tsx file.
      Create several variations of the storybook story that show the src/components/ProfileInformation.tsx file in different states (if applicable).
      The user may have provided you with an example image of the Figma design. If there is an image available, use the image to create realistic text for the stories.
      The user may have provided you with the source images from the Figma design. If there are source images available, use the images for the stories.
      If the source image is not available and you need to mock the image, you MUST use the via.placeholder.com service. Here is how to use it to create a 1024x768 image: https://via.placeholder.com/1024x768
      The example Storybook story is the current format.
      Please use this format, not any previous formats.
      DO NOT add stories to test click events or other interactions. Only add stories to display the component in different states. 
      Never import a variable from a component if it is not explicitly exported!
      DO NOT include backticks or ANY comments in your response. 
      ONLY respond with the full, complete working src/components/ProfileInformation.stories.tsx file.
      As in the example, be sure to define to include the line \`type Story = StoryObj<typeof meta>;\`
      DO NOT use the 'any' type because this will result in TypeScript build errors.
    `);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const eventData = mockedRequest.sendGptVisionRequest.mock.calls[0][4];
    expect(eventData).toEqual(mockEventData);

    expect(mockedFiles.saveNewFile).toHaveBeenCalledTimes(1);
    expect(mockedFiles.saveNewFile).toHaveBeenLastCalledWith(
      "/rootpath",
      "src/components/ProfileInformation.stories.tsx",
      "storybook-story-code",
    );

    expect(mockedEvents.emitCodeEvent).toHaveBeenCalledTimes(1);
    expect(mockedEvents.emitCodeEvent).toHaveBeenLastCalledWith({
      ...mockEventData,
      codeBlock: "storybook-story-code",
      fileName: "src/components/ProfileInformation.stories.tsx",
      filePath: "/rootpath",
      language: "TypeScript",
    });

    expect(mockedCheckAndCommit.checkAndCommit).toHaveBeenCalledTimes(1);
    const checkAndCommitCalls = mockedCheckAndCommit.checkAndCommit.mock.calls;
    const checkAndCommitOptions =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      checkAndCommitCalls[0][0] as CheckAndCommitOptions;
    expect(checkAndCommitOptions.commitMessage).toBe(
      "JACoB commit: add storybook story src/components/ProfileInformation.stories.tsx",
    );
  });

  test("createStory succeeds (JavaScript JSX)", async () => {
    const jsxIssue = {
      ...issuesOpenedNewFilePayload.issue,
      title: "Add a new component => src/components/ProfileInformation.jsx",
    };
    mockedIssue.getIssue.mockResolvedValue({ data: jsxIssue });
    const fsActual = await vi.importActual("fs");
    vi.spyOn(fs, "readFileSync").mockImplementation((file, options) => {
      if (typeof file === "string" && file.startsWith("/rootpath")) {
        return "component-code";
      }
      return (fsActual as typeof fs).readFileSync(file, options);
    });

    const mockEventData = {
      projectId: 1,
      repoFullName: "test-login/test-repo",
      userId: "test-user",
    };

    await createStory({
      ...mockEventData,
      repository: {
        owner: { login: "test-login" },
        name: "test-repo",
      } as Repository,
      token: "token",
      rootPath: "/rootpath",
      branch: "jacob-issue-48-test",
      repoSettings: { language: Language.JavaScript },
      existingPr: { number: 48 } as PullRequest,
    });

    expect(mockedRequest.sendGptVisionRequest).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const systemPrompt = mockedRequest.sendGptVisionRequest.mock.calls[0][1];
    expect(systemPrompt).toContain(dedent`
      Act as a L8 Principal JavaScript Software Engineer at Facebook and create a new storybook story named src/components/ProfileInformation.stories.jsx.
      Use the context and instructions below, along with the code provided by the user, to complete this task.
      
      -- Example Storybook Story
      \`\`\`
      // The code for the Button component:
      // import React from "react";

      // export const Button = ({
    `);
    expect(systemPrompt).toContain(dedent`
      -- Types (optional)
      types

    `);
    expect(systemPrompt).toContain(dedent`
      -- Instructions:
      The user will provide a working src/components/ProfileInformation.jsx file and you will need to create a storybook story that renders the src/components/ProfileInformation.jsx file.
      Create several variations of the storybook story that show the src/components/ProfileInformation.jsx file in different states (if applicable).
      The user may have provided you with an example image of the Figma design. If there is an image available, use the image to create realistic text for the stories.
      The user may have provided you with the source images from the Figma design. If there are source images available, use the images for the stories.
      If the source image is not available and you need to mock the image, you MUST use the via.placeholder.com service. Here is how to use it to create a 1024x768 image: https://via.placeholder.com/1024x768
      The example Storybook story is the current format.
      Please use this format, not any previous formats.
      DO NOT add stories to test click events or other interactions. Only add stories to display the component in different states. 
      Never import a variable from a component if it is not explicitly exported!
      DO NOT include backticks or ANY comments in your response. 
      ONLY respond with the full, complete working src/components/ProfileInformation.stories.jsx file.
    `);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const eventData = mockedRequest.sendGptVisionRequest.mock.calls[0][4];
    expect(eventData).toEqual(mockEventData);

    expect(mockedFiles.saveNewFile).toHaveBeenCalledTimes(1);
    expect(mockedFiles.saveNewFile).toHaveBeenLastCalledWith(
      "/rootpath",
      "src/components/ProfileInformation.stories.jsx",
      "storybook-story-code",
    );

    expect(mockedEvents.emitCodeEvent).toHaveBeenCalledTimes(1);
    expect(mockedEvents.emitCodeEvent).toHaveBeenLastCalledWith({
      ...mockEventData,
      codeBlock: "storybook-story-code",
      fileName: "src/components/ProfileInformation.stories.jsx",
      filePath: "/rootpath",
      language: "JavaScript",
    });

    expect(mockedCheckAndCommit.checkAndCommit).toHaveBeenCalledTimes(1);
    const checkAndCommitCalls = mockedCheckAndCommit.checkAndCommit.mock.calls;
    const checkAndCommitOptions =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      checkAndCommitCalls[0][0] as CheckAndCommitOptions;
    expect(checkAndCommitOptions.commitMessage).toBe(
      "JACoB commit: add storybook story src/components/ProfileInformation.stories.jsx",
    );
  });
});
