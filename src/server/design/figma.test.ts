import {
  describe,
  expect,
  test,
  vi,
  beforeEach,
  afterEach,
  afterAll,
} from "vitest";
import { createMocks } from "node-mocks-http";

import { newIssueForFigmaFile } from "./figma";

const mockedCheckToken = vi.hoisted(() =>
  vi.fn().mockImplementation(
    () =>
      new Promise((resolve) =>
        resolve({
          status: 200,
          data: { user: { login: "test-login-user" } },
        }),
      ),
  ),
);

const mockedGetRepoInstallation = vi.hoisted(() =>
  vi.fn().mockImplementation(
    () =>
      new Promise((resolve) =>
        resolve({
          status: 200,
          data: { id: 42 },
        }),
      ),
  ),
);

const mockedCreateIssue = vi.hoisted(() =>
  vi.fn().mockImplementation(
    () =>
      new Promise((resolve) =>
        resolve({
          status: 200,
          data: { number: 99 },
        }),
      ),
  ),
);

const mockedOctokitRest = vi.hoisted(() => ({
  Octokit: vi.fn().mockImplementation(() => ({
    rest: {
      apps: {
        checkToken: mockedCheckToken,
        getRepoInstallation: mockedGetRepoInstallation,
      },
      issues: {
        create: mockedCreateIssue,
      },
    },
  })),
}));
vi.mock("@octokit/rest", () => mockedOctokitRest);

const mockedRequest = vi.hoisted(() => ({
  sendGptRequest: vi
    .fn()
    .mockImplementation(
      () => new Promise((resolve) => resolve("code-converted-from-figma-map")),
    ),
}));
vi.mock("../openai/request", () => mockedRequest);

const originalPromptsFolder = process.env.PROMPT_FOLDER ?? "src/server/prompts";

describe("newIssueForFigmaFile", () => {
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

  test("edit with no parameters", async () => {
    const { req, res } = createMocks({ params: { verb: "edit" } });

    await newIssueForFigmaFile(req, res);

    expect(res.statusCode).toBe(400);
  });

  test("edit", async () => {
    const { req, res } = createMocks({
      params: { verb: "edit" },
      body: {
        figmaMap: "test-figma-map",
        fileName: "test-filename.tsx",
        additionalInstructions: "test-additional-instructions",
        repo: {
          name: "test-repo",
          full_name: "test-login/test-repo",
          owner: { login: "test-login" },
        },
      },
    });

    await newIssueForFigmaFile(req, res);

    expect(res.statusCode).toBe(200);

    expect(mockedRequest.sendGptRequest).toHaveBeenCalledOnce();
    expect(mockedRequest.sendGptRequest.mock.calls[0][0]).toContain(
      "=== START FigML ===\ntest-figma-map\n=== END FigML ===\n",
    );
    expect(mockedRequest.sendGptRequest.mock.calls[0][0]).toContain(
      "test-additional-instructions",
    );
    expect(mockedRequest.sendGptRequest.mock.calls[0][1]).toContain(
      "Your job is to take a representation of a Figma design and convert it into JSX to be used in a React functional component.",
    );
    expect(mockedRequest.sendGptRequest.mock.calls[0][2]).toBe(0.5);

    expect(mockedGetRepoInstallation).toHaveBeenCalledOnce();
    expect(mockedOctokitRest.Octokit).toHaveBeenCalledOnce();

    expect(mockedCreateIssue).toHaveBeenCalledOnce();
    const createIssueOptions = mockedCreateIssue.mock.calls[0][0];
    expect(createIssueOptions.owner).toBe("test-login");
    expect(createIssueOptions.repo).toBe("test-repo");
    expect(createIssueOptions.assignees).toStrictEqual(["test-login-user"]);
    expect(createIssueOptions.title).toBe(
      "Update the design for test-filename.tsx",
    );
    expect(createIssueOptions.body).toContain(
      "A new design has been added to Figma for the file test-filename.tsx.",
    );
    expect(createIssueOptions.body).toContain(
      "- @jacob Here are your instructions for updating the codebase:",
    );
    expect(createIssueOptions.body).toContain("code-converted-from-figma-map");
    expect(createIssueOptions.body).toContain("test-additional-instructions");
  });

  test("new with no parameters", async () => {
    const { req, res } = createMocks({ params: { verb: "new" } });

    await newIssueForFigmaFile(req, res);

    expect(res.statusCode).toBe(400);
  });

  test("new", async () => {
    const { req, res } = createMocks({
      params: { verb: "new" },
      body: {
        figmaMap: "test-figma-map",
        fileName: "test-filename.tsx",
        additionalInstructions: "test-additional-instructions",
        repo: {
          name: "test-repo",
          full_name: "test-login/test-repo",
          owner: { login: "test-login" },
        },
      },
    });

    await newIssueForFigmaFile(req, res);

    expect(res.statusCode).toBe(200);

    expect(mockedRequest.sendGptRequest).toHaveBeenCalledOnce();
    expect(mockedRequest.sendGptRequest.mock.calls[0][0]).toContain(
      "=== START FigML ===\ntest-figma-map\n=== END FigML ===\n",
    );
    expect(mockedRequest.sendGptRequest.mock.calls[0][0]).toContain(
      "test-additional-instructions",
    );
    expect(mockedRequest.sendGptRequest.mock.calls[0][1]).toContain(
      "Your job is to take a representation of a Figma design and convert it into JSX to be used in a React functional component.",
    );
    expect(mockedRequest.sendGptRequest.mock.calls[0][2]).toBe(0.5);

    expect(mockedGetRepoInstallation).toHaveBeenCalledOnce();
    expect(mockedOctokitRest.Octokit).toHaveBeenCalledOnce();

    expect(mockedCreateIssue).toHaveBeenCalledOnce();
    const createIssueOptions = mockedCreateIssue.mock.calls[0][0];
    expect(createIssueOptions.owner).toBe("test-login");
    expect(createIssueOptions.repo).toBe("test-repo");
    expect(createIssueOptions.assignees).toStrictEqual(["test-login-user"]);
    expect(createIssueOptions.title).toBe(
      "Create new file => test-filename.tsx",
    );
    expect(createIssueOptions.body).toContain(
      "A new design has been added to Figma for the file test-filename.tsx.",
    );
    expect(createIssueOptions.body).toContain(
      "- @jacob Here are your instructions for creating the new file:",
    );
    expect(createIssueOptions.body).toContain("code-converted-from-figma-map");
    expect(createIssueOptions.body).toContain("test-additional-instructions");
  });
});
