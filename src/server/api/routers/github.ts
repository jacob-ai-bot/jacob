import { z } from "zod";
import { Octokit } from "@octokit/rest";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { getIssue } from "~/server/github/issue";

import {
  cloneAndGetSourceMap,
  getAllRepos,
  getExtractedIssue,
  validateRepo,
} from "../utils";
import { type Todo } from "./events";
import { TodoStatus } from "~/server/db/enums";

export const githubRouter = createTRPCRouter({
  getRepos: protectedProcedure.input(z.object({}).optional()).query(
    async ({
      ctx: {
        session: { accessToken },
      },
    }) => {
      return await getAllRepos(accessToken);
    },
  ),
  getExtractedIssue: protectedProcedure
    .input(z.object({ repo: z.string(), issueText: z.string() }))
    .query(
      async ({
        input: { repo, issueText },
        ctx: {
          session: { accessToken },
        },
      }) => {
        const [repoOwner, repoName] = repo?.split("/") ?? [];

        if (!repoOwner || !repoName || !issueText?.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid request",
          });
        }
        await validateRepo(repoOwner, repoName, accessToken);

        const sourceMap = await cloneAndGetSourceMap(repo, accessToken);
        const extractedIssue = await getExtractedIssue(sourceMap, issueText);
        return extractedIssue;
      },
    ),
  getTodos: protectedProcedure
    .input(z.object({ repo: z.string(), max: z.number().optional() }))
    .query(
      async ({
        input: { repo, max = 10 },
        ctx: {
          session: { accessToken },
        },
      }) => {
        const [repoOwner, repoName] = repo?.split("/") ?? [];

        if (!repoOwner || !repoName) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid request",
          });
        }
        await validateRepo(repoOwner, repoName, accessToken);

        const sourceMap = await cloneAndGetSourceMap(repo, accessToken);
        const octokit = new Octokit({ auth: accessToken });

        const { data: issues } = await octokit.issues.listForRepo({
          owner: repoOwner,
          repo: repoName,
          state: "open",
        });

        // remove the pull requests
        const issuesWithoutPullRequests = issues.filter(
          ({ pull_request }) => !pull_request,
        );

        const ids = issuesWithoutPullRequests
          .map((issue) => issue.number)
          .filter(Boolean)
          .slice(0, max);

        const issueData = await Promise.all(
          ids.map((issueNumber) =>
            getIssue(
              { name: repoName, owner: { login: repoOwner } },
              accessToken,
              issueNumber,
            ),
          ),
        );

        const extractedIssues = await Promise.all(
          issueData.map(async ({ data: issue }) => {
            const issueBody = issue.body ? `\n${issue.body}` : "";
            const issueText = `${issue.title}${issueBody}`;

            const extractedIssue = await getExtractedIssue(
              sourceMap,
              issueText,
            );

            const todo: Todo = {
              id: `issue-${issue.number}`,
              description: `${issue.title}\n\n${issueBody}`,
              name: extractedIssue.commitTitle ?? issue.title ?? "New Todo",
              status: TodoStatus.TODO,
              issueId: issue.number,
              ...extractedIssue,
            };
            return todo;
          }),
        );

        return extractedIssues;
      },
    ),
  createIssue: protectedProcedure
    .input(
      z.object({
        repo: z.string(),
        title: z.string(),
        body: z.string().optional(),
      }),
    )
    .mutation(
      async ({
        input: { repo, title, body },
        ctx: {
          session: { accessToken },
        },
      }) => {
        const octokit = new Octokit({ auth: accessToken });
        const [repoOwner, repoName] = repo?.split("/") ?? [];

        if (!repoOwner || !repoName) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid request",
          });
        }

        // Creating a new GitHub issue
        const {
          data: { id },
        } = await octokit.issues.create({
          owner: repoOwner,
          repo: repoName,
          title,
          body,
        });

        return { id };
      },
    ),
  updateIssue: protectedProcedure
    .input(
      z.object({
        repo: z.string(),
        id: z.number(),
        title: z.string().optional(),
        body: z.string().optional(),
      }),
    )
    .mutation(
      async ({
        input: { repo, id, title, body },
        ctx: {
          session: { accessToken },
        },
      }) => {
        const octokit = new Octokit({ auth: accessToken });
        const [repoOwner, repoName] = repo.split("/");

        if (!repoOwner || !repoName) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid request",
          });
        }

        // Updating an existing GitHub issue
        await octokit.issues.update({
          owner: repoOwner,
          repo: repoName,
          issue_number: id,
          title,
          body,
        });

        return { id };
      },
    ),
});
