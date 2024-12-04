import { describe, it, expect, vi } from "vitest";
import { fetchNewJiraIssues } from "./jira";
import * as evaluateIssueModule from "./evaluateIssue";
import * as db from "../db/db";

vi.mock("./evaluateIssue", () => ({
  evaluateJiraIssue: vi.fn(),
}));

vi.mock("../db/db", () => ({
  issues: {
    findByOptional: vi.fn(),
    create: vi.fn(),
    findBy: vi.fn().mockReturnThis(),
    update: vi.fn(),
  },
  issueBoards: {
    findBy: vi.fn().mockResolvedValue({ id: 1 }),
  },
  projects: {
    findBy: vi.fn().mockResolvedValue({ repoFullName: "owner/repo" }),
  },
}));

describe("fetchNewJiraIssues", () => {
  it("should not create a GitHub issue for low evaluation score", async () => {
    vi.mocked(evaluateIssueModule.evaluateJiraIssue).mockResolvedValue({
      score: 3.5,
      feedback: "Add more details to the issue description.",
    });

    // Mock fetch response for Jira issues
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        issues: [
          {
            id: "1001",
            key: "JIRA-1",
            fields: {
              summary: "Short issue",
              description: "Needs more info",
              attachment: [],
              priority: {
                iconUrl: "https://jira.example.com",
              },
            },
            self: "https://jira.example.com/rest/api/3/issue/1001",
          },
        ],
      }),
    });

    await fetchNewJiraIssues({
      jiraAccessToken: "jira-token",
      cloudId: "cloud-id",
      projectId: 1,
      boardId: "BOARD-1",
      userId: 1,
      githubAccessToken: "github-token",
    });

    expect(evaluateIssueModule.evaluateJiraIssue).toHaveBeenCalled();
    expect(db.issues.create).toHaveBeenCalledWith(
      expect.objectContaining({
        issueId: "1001",
        didCreateGithubIssue: false,
      }),
    );
    expect(db.issues.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        didCreateGithubIssue: true,
      }),
    );
  });

  it("should create a GitHub issue for high evaluation score", async () => {
    vi.mocked(evaluateIssueModule.evaluateJiraIssue).mockResolvedValue({
      score: 4.5,
    });

    // Mock fetch response for Jira issues
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        issues: [
          {
            id: "1002",
            key: "JIRA-2",
            fields: {
              summary: "Well-defined issue",
              description: "Detailed description of the issue.",
              attachment: [],
              priority: {
                iconUrl: "https://jira.example.com",
              },
            },
            self: "https://jira.example.com/rest/api/3/issue/1002",
          },
        ],
      }),
    });

    await fetchNewJiraIssues({
      jiraAccessToken: "jira-token",
      cloudId: "cloud-id",
      projectId: 1,
      boardId: "BOARD-1",
      userId: 1,
      githubAccessToken: "github-token",
    });

    expect(evaluateIssueModule.evaluateJiraIssue).toHaveBeenCalled();
    expect(db.issues.create).toHaveBeenCalledWith(
      expect.objectContaining({
        issueId: "1002",
        didCreateGithubIssue: false,
      }),
    );
    expect(db.issues.update).toHaveBeenCalledWith(
      expect.objectContaining({
        didCreateGithubIssue: true,
      }),
    );
  });
});
