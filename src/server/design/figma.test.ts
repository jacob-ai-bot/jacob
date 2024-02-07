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

const mockedOctokitAuthApp = vi.hoisted(() => ({
  createAppAuth: vi
    .fn()
    .mockImplementation(() =>
      vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => resolve({ token: "fake-token" })),
        ),
    ),
}));
vi.mock("@octokit/auth-app", () => mockedOctokitAuthApp);

const mockedRepo = vi.hoisted(() => ({
  getFile: vi
    .fn()
    .mockImplementation(
      () =>
        new Promise((_resolve, reject) => reject(new Error("File not found"))),
    ),
}));
vi.mock("../github/repo", () => mockedRepo);

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
  sendGptVisionRequest: vi
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
        snapshotUrl: "https://example.com/snapshot.png",
        repo: {
          name: "test-repo",
          full_name: "test-login/test-repo",
          owner: { login: "test-login" },
        },
      },
    });

    await newIssueForFigmaFile(req, res);

    expect(res.statusCode).toBe(200);

    expect(mockedRequest.sendGptVisionRequest).toHaveBeenCalledOnce();
    expect(mockedRequest.sendGptVisionRequest.mock.calls[0][0]).toContain(
      "Act as an expert-level TypeScript Front-End TailwindCSS software developer.",
    );
    expect(mockedRequest.sendGptVisionRequest.mock.calls[0][0]).toContain(
      "=== START FigML ===\ntest-figma-map\n=== END FigML ===\n",
    );
    expect(mockedRequest.sendGptVisionRequest.mock.calls[0][0]).toContain(
      "test-additional-instructions",
    );
    expect(mockedRequest.sendGptVisionRequest.mock.calls[0][1]).toContain(
      "Your job is to take a representation of a Figma design and convert it into JSX to be used in a React functional component.",
    );
    expect(mockedRequest.sendGptVisionRequest.mock.calls[0][1]).toContain(
      "w-[40px] h-[40px] border-solid border-black",
    );
    expect(mockedRequest.sendGptVisionRequest.mock.calls[0][1]).toContain(
      "Re-write the psuedo-TailwindCSS using only the standard TailwindCSS classes.",
    );
    expect(mockedRequest.sendGptVisionRequest.mock.calls[0][2]).toContain(
      "https://example.com/snapshot.png",
    );
    expect(mockedRequest.sendGptVisionRequest.mock.calls[0][3]).toBe(0.5);

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
      "- @jacob-ai-bot Here are your instructions for updating the codebase:",
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
        snapshotUrl: "https://example.com/snapshot.png",
        imageUrls: [
          "https://example.com/image1.png",
          "https://example.com/image2.png",
        ],
      },
    });

    await newIssueForFigmaFile(req, res);

    expect(res.statusCode).toBe(200);

    expect(mockedRequest.sendGptVisionRequest).toHaveBeenCalledOnce();
    expect(mockedRequest.sendGptVisionRequest.mock.calls[0][0]).toContain(
      "=== START FigML ===\ntest-figma-map\n=== END FigML ===\n",
    );
    expect(mockedRequest.sendGptVisionRequest.mock.calls[0][0]).toContain(
      "test-additional-instructions",
    );
    expect(mockedRequest.sendGptVisionRequest.mock.calls[0][1]).toContain(
      "Your job is to take a representation of a Figma design and convert it into JSX to be used in a React functional component.",
    );
    expect(mockedRequest.sendGptVisionRequest.mock.calls[0][1]).toContain(
      "Use the Font Awesome package if possible.",
    );
    expect(mockedRequest.sendGptVisionRequest.mock.calls[0][2]).toContain(
      "https://example.com/snapshot.png",
    );
    expect(mockedRequest.sendGptVisionRequest.mock.calls[0][3]).toBe(0.5);

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
      "- @jacob-ai-bot Here are your instructions for creating the new file:",
    );
    expect(createIssueOptions.body).toContain(
      "Specifically, ONLY use valid TailwindCSS classes. For arbitrary values, convert to standard TailwindCSS classes as often as possible. Use the custom Tailwind.config color names if there is an exact match.",
    );
    expect(createIssueOptions.body).toContain(
      "and other modern TailwindCSS features",
    );
    expect(createIssueOptions.body).toContain(
      "const element = <FontAwesomeIcon icon={faEnvelope} />",
    );
    expect(createIssueOptions.body).toContain("code-converted-from-figma-map");
    expect(createIssueOptions.body).toContain("test-additional-instructions");
    expect(createIssueOptions.body).toContain(
      "![image](https://example.com/image1.png)",
    );
    expect(createIssueOptions.body).toContain(
      "![image](https://example.com/image2.png)",
    );
  });

  test("new with jason.config set to Language.Javascript, Style.CSS, and IconSet.Heroicons", async () => {
    mockedRepo.getFile.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          resolve({
            data: {
              type: "file",
              content: btoa(
                JSON.stringify({
                  language: "JavaScript",
                  style: "CSS",
                  iconSet: "Heroicons",
                }),
              ),
            },
          }),
        ),
    );

    const { req, res } = createMocks({
      params: { verb: "new" },
      body: {
        figmaMap: "test-figma-map",
        fileName: "test-filename.tsx",
        additionalInstructions: "test-additional-instructions",
        snapshotUrl: "https://example.com/snapshot.png",
        repo: {
          name: "test-repo",
          full_name: "test-login/test-repo",
          owner: { login: "test-login" },
        },
      },
    });

    await newIssueForFigmaFile(req, res);

    expect(res.statusCode).toBe(200);

    expect(mockedRequest.sendGptVisionRequest).toHaveBeenCalledOnce();
    expect(mockedRequest.sendGptVisionRequest.mock.calls[0][0]).toContain(
      "Act as an expert-level JavaScript Front-End CSS software developer.",
    );
    expect(mockedRequest.sendGptVisionRequest.mock.calls[0][1]).toContain(
      "Re-write the psuedo-CSS using only standard CSS styles.",
    );
    expect(mockedRequest.sendGptVisionRequest.mock.calls[0][1]).toContain(
      "width: 40px; height: 40px; border: 1px solid #000;",
    );
    expect(mockedRequest.sendGptVisionRequest.mock.calls[0][1]).toContain(
      "Use the Heroicons package if possible.",
    );

    expect(mockedCreateIssue).toHaveBeenCalledOnce();
    const createIssueOptions = mockedCreateIssue.mock.calls[0][0];
    expect(createIssueOptions.body).not.toContain(
      "Specifically, ONLY use valid TailwindCSS classes. For arbitrary values, convert to standard TailwindCSS classes as often as possible. Use the custom Tailwind.config color names if there is an exact match.",
    );
    expect(createIssueOptions.body).not.toContain(
      "and other modern TailwindCSS features",
    );
    expect(createIssueOptions.body).toContain(
      `const element = <BeakerIcon className="h-6 w-6 text-blue-500"/>`,
    );
  });
});
