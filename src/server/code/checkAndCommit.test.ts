import dedent from "ts-dedent";
import { describe, test, expect, afterEach, afterAll, vi } from "vitest";
import { Issue, Repository } from "@octokit/webhooks-types";

import issueCommentCreatedPRCommandFixBuildErrorPayload from "../../data/test/webhooks/issue_comment.created.prCommand.fixBuildError.json";
import { checkAndCommit, type PullRequest } from "./checkAndCommit";

const mockedDynamicImport = vi.hoisted(() => ({
  dynamicImport: vi
    .fn()
    .mockImplementation(async (specifier) => await import(specifier)),
}));
vi.mock("../utils/dynamicImport", () => mockedDynamicImport);

const mockedCheck = vi.hoisted(() => ({
  runBuildCheck: vi
    .fn()
    .mockImplementation(() => new Promise((resolve) => resolve(undefined))),
}));
vi.mock("../build/node/check", () => mockedCheck);

const mockedCommit = vi.hoisted(() => ({
  addCommitAndPush: vi
    .fn()
    .mockImplementation(() => new Promise((resolve) => resolve(undefined))),
}));
vi.mock("../git/commit", () => mockedCommit);

const mockedFS = vi.hoisted(() => ({
  default: {
    existsSync: vi.fn().mockImplementation(() => true),
  },
}));
vi.mock("fs", () => mockedFS);

const mockedPR = vi.hoisted(() => ({
  createPR: vi.fn().mockImplementation(
    () =>
      new Promise((resolve) =>
        resolve({
          data: {
            number: 70,
            title: "created-pr-title",
            prUrl: "https://github.com/created-pr-url",
          },
        }),
      ),
  ),
  markPRReadyForReview: vi
    .fn()
    .mockImplementation(() => new Promise((resolve) => resolve(undefined))),
}));
vi.mock("../github/pr", () => mockedPR);

const mockedIssue = vi.hoisted(() => ({
  getIssue: vi
    .fn()
    .mockImplementation(
      () => new Promise((resolve) => resolve({ data: { body: "body" } })),
    ),
  addCommentToIssue: vi
    .fn()
    .mockImplementation(() => new Promise((resolve) => resolve({}))),
}));
vi.mock("../github/issue", () => mockedIssue);

describe("checkAndCommit", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  test("checkAndCommit calls", async () => {
    const issue =
      issueCommentCreatedPRCommandFixBuildErrorPayload.issue as Issue;
    const repository = {
      owner: { login: "test-login" },
      name: "test-repo",
    } as Repository;

    await checkAndCommit({
      repository,
      token: "token",
      rootPath: "/rootpath",
      branch: "otto-issue-48-test",
      issue,
      commitMessage: "test-commit-message",
      existingPr: {
        number: 48,
        node_id: "PR_nodeid",
        title: "pr-title",
        html_url: "https://github.com/pr-url",
      } as PullRequest,
    });

    expect(mockedCheck.runBuildCheck).toHaveBeenCalledTimes(1);
    expect(mockedCheck.runBuildCheck).toHaveBeenLastCalledWith("/rootpath");

    expect(mockedCommit.addCommitAndPush).toHaveBeenCalledTimes(1);
    expect(mockedCommit.addCommitAndPush).toHaveBeenLastCalledWith(
      "/rootpath",
      "otto-issue-48-test",
      "test-commit-message",
    );

    expect(mockedPR.markPRReadyForReview).toHaveBeenCalledTimes(1);
    expect(mockedPR.markPRReadyForReview).toHaveBeenLastCalledWith(
      "token",
      "PR_nodeid",
    );

    expect(mockedPR.createPR).not.toHaveBeenCalled();

    expect(mockedIssue.addCommentToIssue).toHaveBeenCalledTimes(2);
    expect(mockedIssue.addCommentToIssue).toHaveBeenNthCalledWith(
      1,
      repository,
      48,
      "token",
      "Hello human! 👋\n\n" +
        "This PR was updated by Otto\n\n" +
        "## Next Steps\n\n" +
        "1. Please review the PR carefully. Auto-generated code can and will contain subtle bugs and mistakes.\n\n" +
        "2. If you identify code that needs to be changed, please reject the PR with a specific reason.\n" +
        "Be as detailed as possible in your comments. Otto will take these comments, make changes to the code and push up changes.\n" +
        "Please note that this process will take a few minutes.\n\n" +
        "3. Once the code looks good, approve the PR and merge the code.",
    );
    expect(mockedIssue.addCommentToIssue).toHaveBeenLastCalledWith(
      repository,
      48,
      "token",
      "## Update\n\nI've completed my work on this issue and have updated this pull request: [pr-title](https://github.com/pr-url).\n\nPlease review my changes there.",
    );
  });

  test("checkAndCommit - with build error", async () => {
    mockedCheck.runBuildCheck.mockImplementation(
      () =>
        new Promise((_, reject) => {
          const message = dedent`
          Command failed: npm run build --verbose
          npm verb cli /opt/render/project/nodes/node-18.17.1/bin/node /opt/render/project/nodes/node-18.17.1/bin/npm
          npm info using npm@9.6.7
          npm info using node@v18.17.1
          npm verb title npm run build
          npm verb argv "run" "build" "--loglevel" "verbose"
          npm verb logfile logs-max:10 dir:/opt/render/.cache/_logs/2023-11-23T15_51_04_136Z-
          npm verb logfile /opt/render/.cache/_logs/2023-11-23T15_51_04_136Z-debug-0.log
          Failed to compile.

          ./src/components/AnalyticCard.tsx:2:33
          Type error: Cannot find module '@fortawesome/react-fontawesome' or its corresponding type declarations.

            1 | import React from 'react';
          > 2 | import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
              |                                 ^
            3 | import { faWallet } from '@fortawesome/free-solid-svg-icons';
            4 |
            5 | interface AnalyticCardProps {
          npm verb exit 1
          npm verb code 1
        `;
          reject(new Error(message));
        }),
    );

    const issue =
      issueCommentCreatedPRCommandFixBuildErrorPayload.issue as Issue;
    const repository = {
      owner: { login: "test-login" },
      name: "test-repo",
    } as Repository;

    await checkAndCommit({
      repository,
      token: "token",
      rootPath: "/rootpath",
      branch: "otto-issue-48-test",
      issue,
      commitMessage: "test-commit-message",
      existingPr: {
        number: 48,
        node_id: "PR_nodeid",
        title: "pr-title",
        html_url: "https://github.com/pr-url",
      } as PullRequest,
    });

    expect(mockedCheck.runBuildCheck).toHaveBeenCalledTimes(1);
    expect(mockedCheck.runBuildCheck).toHaveBeenLastCalledWith("/rootpath");

    expect(mockedCommit.addCommitAndPush).toHaveBeenCalledTimes(1);
    expect(mockedCommit.addCommitAndPush).toHaveBeenLastCalledWith(
      "/rootpath",
      "otto-issue-48-test",
      "test-commit-message",
    );

    expect(mockedPR.markPRReadyForReview).not.toHaveBeenCalled();
    expect(mockedPR.createPR).not.toHaveBeenCalled();

    expect(mockedIssue.addCommentToIssue).toHaveBeenCalledTimes(2);
    expect(mockedIssue.addCommentToIssue).toHaveBeenNthCalledWith(
      1,
      repository,
      48,
      "token",
      "This PR has been updated with a new commit.\n\n" +
        "## Next Steps\n\n" +
        "I am working to resolve a build error. I will update this PR with my progress.\n" +
        "@otto fix build error\n\n" +
        "## Error Message:\n\n" +
        "Command failed: npm run build --verbose\n" +
        "npm verb cli /opt/render/project/nodes/node-18.17.1/bin/node /opt/render/project/nodes/node-18.17.1/bin/npm\n" +
        "npm info using npm@9.6.7\n" +
        "npm info using node@v18.17.1\n" +
        "npm verb title npm run build\n" +
        'npm verb argv "run" "build" "--loglevel" "verbose"\n' +
        "npm verb logfile logs-max:10 dir:/opt/render/.cache/_logs/2023-11-23T15_51_04_136Z-\n" +
        "npm verb logfile /opt/render/.cache/_logs/2023-11-23T15_51_04_136Z-debug-0.log\n" +
        "Failed to compile.\n\n" +
        "./src/components/AnalyticCard.tsx:2:33\n" +
        "Type error: Cannot find module '@fortawesome/react-fontawesome' or its corresponding type declarations.\n\n" +
        "  1 | import React from 'react';\n" +
        "> 2 | import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';\n" +
        "    |                                 ^\n" +
        "  3 | import { faWallet } from '@fortawesome/free-solid-svg-icons';\n" +
        "  4 |\n" +
        "  5 | interface AnalyticCardProps {\n" +
        "npm verb exit 1\n" +
        "npm verb code 1",
    );
    expect(mockedIssue.addCommentToIssue).toHaveBeenLastCalledWith(
      repository,
      48,
      "token",
      "## Update\n\n" +
        "I've updated this pull request: [pr-title](https://github.com/pr-url).\n\n" +
        "The changes currently result in a build error, so I'll be making some additional changes before it is ready to merge.",
    );
  });
});
