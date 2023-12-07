import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  vi,
} from "vitest";
import { setupServer, type SetupServer } from "msw/node";
import { HttpResponse, http } from "msw";
import "dotenv/config";

import issuesOpenedNewFilePayload from "../../data/test/webhooks/issues.opened.newFile.json";
import issuesOpenedEditFilesPayload from "../../data/test/webhooks/issues.opened.editFiles.json";
import { onGitHubEvent, type WebhookIssueOpenedEvent } from "./queue";

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

const mockedDb = vi.hoisted(() => ({
  db: {
    projects: {
      create: vi.fn().mockImplementation(() => ({
        onConflict: vi.fn().mockImplementation(() => ({
          merge: vi
            .fn()
            .mockImplementation(
              () => new Promise((resolve) => resolve({ id: 777 })),
            ),
        })),
      })),
    },
  },
}));

const mockedClone = vi.hoisted(() => ({
  cloneRepo: vi
    .fn()
    .mockImplementation(
      () =>
        new Promise((resolve) =>
          resolve({ path: "/tmp/otto/1", cleanup: vi.fn() }),
        ),
    ),
}));

const mockedCheck = vi.hoisted(() => ({
  runBuildCheck: vi
    .fn()
    .mockImplementation(() => new Promise((resolve) => resolve(undefined))),
}));

const mockedNewFile = vi.hoisted(() => ({
  createNewFile: vi
    .fn()
    .mockImplementation(() => new Promise((resolve) => resolve(undefined))),
}));

const mockedEditFiles = vi.hoisted(() => ({
  editFiles: vi
    .fn()
    .mockImplementation(() => new Promise((resolve) => resolve(undefined))),
}));

vi.mock("@octokit/auth-app", () => ({
  ...mockedOctokitAuthApp,
}));
vi.mock("../db/db", () => ({
  ...mockedDb,
}));
vi.mock("../git/clone", () => ({
  ...mockedClone,
}));
vi.mock("../build/node/check", () => ({
  ...mockedCheck,
}));
vi.mock("../code/newFile", () => ({
  ...mockedNewFile,
}));
vi.mock("../code/editFiles", () => ({
  ...mockedEditFiles,
}));

describe("onGitHubEvent", () => {
  let server: SetupServer | undefined;

  beforeAll(() => {
    server = setupServer();
    server.listen({ onUnhandledRequest: "error" });
  });

  beforeEach(() => {
    server?.resetHandlers();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    server?.close();
    vi.restoreAllMocks();
  });

  test("issue opened - new file", async () => {
    server?.use(
      http.post(
        "https://api.github.com/app/installations/42293588/access_tokens",
        () => HttpResponse.json({}),
      ),
    );
    server?.use(
      http.post(
        "https://api.github.com/repos/PioneerSquareLabs/t3-starter-template/issues/47/comments",
        () => HttpResponse.json({}),
      ),
    );

    await onGitHubEvent({
      id: "1",
      name: "issues",
      payload: issuesOpenedNewFilePayload,
    } as WebhookIssueOpenedEvent);

    expect(vi.mocked(mockedClone.cloneRepo)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(mockedCheck.runBuildCheck)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(mockedNewFile.createNewFile)).toHaveBeenCalledTimes(1);
  });

  test("issue opened - edit files", async () => {
    server?.use(
      http.post(
        "https://api.github.com/app/installations/42293588/access_tokens",
        () => HttpResponse.json({}),
      ),
    );
    server?.use(
      http.post(
        "https://api.github.com/repos/PioneerSquareLabs/t3-starter-template/issues/49/comments",
        () => HttpResponse.json({}),
      ),
    );

    await onGitHubEvent({
      id: "1",
      name: "issues",
      payload: issuesOpenedEditFilesPayload,
    } as WebhookIssueOpenedEvent);

    expect(vi.mocked(mockedClone.cloneRepo)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(mockedCheck.runBuildCheck)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(mockedEditFiles.editFiles)).toHaveBeenCalledTimes(1);
  });
});
