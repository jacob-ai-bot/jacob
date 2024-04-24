import { z } from "zod";
import { Octokit } from "@octokit/rest";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { cloneRepo } from "~/server/git/clone";
import { getSourceMap } from "~/server/analyze/sourceMap";
import { traverseCodebase } from "~/server/analyze/traverse";
import { parseTemplate, getRepoSettings } from "~/server/utils";
import { getIssue } from "~/server/github/issue";
import {
  ExtractedIssueInfoSchema,
  type ExtractedIssueInfo,
} from "~/server/code/extractedIssue";
import { sendGptRequestWithSchema } from "~/server/openai/request";

export const githubRouter = createTRPCRouter({
  getRepos: protectedProcedure.input(z.object({}).optional()).query(
    async ({
      ctx: {
        session: { accessToken },
      },
    }) => {
      const octokit = new Octokit({ auth: accessToken });
      const {
        data: { installations },
      } = await octokit.rest.apps.listInstallationsForAuthenticatedUser();
      const repoLists = await Promise.all(
        installations.map(async (installation) => {
          const {
            data: { repositories },
          } = await octokit.rest.apps.listInstallationReposForAuthenticatedUser(
            {
              installation_id: installation.id,
            },
          );
          return repositories.map(({ id, node_id, full_name }) => ({
            id,
            node_id,
            full_name,
          }));
        }),
      );
      return repoLists.flat();
    },
  ),
  getExtractedIssues: protectedProcedure
    .input(z.object({ repo: z.string(), ids: z.array(z.number()) }))
    .query(
      async ({
        input: { repo, ids },
        ctx: {
          session: { accessToken },
        },
      }) => {
        const [repoOwner, repoName] = repo?.split("/") ?? [];

        if (!repoOwner || !repoName || ids.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid request",
          });
        }

        let cleanupClone: (() => Promise<void>) | undefined;
        try {
          const { path, cleanup } = await cloneRepo(
            repo,
            undefined,
            accessToken,
          );
          cleanupClone = cleanup;

          const repoSettings = getRepoSettings(path);
          const sourceMap =
            getSourceMap(path, repoSettings) || (await traverseCodebase(path));

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

              const extractedIssueTemplateParams = {
                sourceMap,
                issueText,
              };

              const extractedIssueSystemPrompt = parseTemplate(
                "dev",
                "extracted_issue",
                "system",
                extractedIssueTemplateParams,
              );
              const extractedIssueUserPrompt = parseTemplate(
                "dev",
                "extracted_issue",
                "user",
                extractedIssueTemplateParams,
              );
              const extractedIssue = (await sendGptRequestWithSchema(
                extractedIssueUserPrompt,
                extractedIssueSystemPrompt,
                ExtractedIssueInfoSchema,
                0.2,
              )) as ExtractedIssueInfo;

              return {
                issueNumber: issue.number,
                ...extractedIssue,
              };
            }),
          );

          return extractedIssues;
        } finally {
          await cleanupClone?.();
        }
      },
    ),
});
