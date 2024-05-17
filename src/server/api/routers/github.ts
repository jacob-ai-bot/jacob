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
import { Issue, type Todo } from "./events";
import { TodoStatus } from "~/server/db/enums";
import { sendGptRequestWithSchema } from "~/server/openai/request";
import { Mode } from "~/types";

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
    .input(
      z.object({
        repo: z.string(),
        mode: z.nativeEnum(Mode).optional(),
        max: z.number().optional(),
      }),
    )
    .query(
      async ({
        input: { repo, mode = Mode.EXISTING_ISSUES, max = 10 },
        ctx: {
          session: { accessToken, user },
        },
      }) => {
        const [repoOwner, repoName] = repo?.split("/") ?? [];

        if (!repoOwner || !repoName) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid request",
          });
        }
        // only fetch issues when the use is in the 'existing issues' mode
        if (mode !== Mode.EXISTING_ISSUES) {
          return [];
        }

        await validateRepo(repoOwner, repoName, accessToken);

        const sourceMap = await cloneAndGetSourceMap(repo, accessToken);
        const octokit = new Octokit({ auth: accessToken });

        const { data: unassignedIssues } = await octokit.issues.listForRepo({
          owner: repoOwner,
          repo: repoName,
          state: "open",
          assignee: "none",
        });

        const { data: myIssues } = await octokit.issues.listForRepo({
          owner: repoOwner,
          repo: repoName,
          state: "open",
          assignee: (user as { login?: string })?.login ?? "none",
        });

        const issues = [...unassignedIssues, ...myIssues];

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
  extractIssue: protectedProcedure
    .input(z.object({ issueText: z.string() }))
    .query(async ({ input: { issueText } }) => {
      try {
        // Define a Zod schema for the expected response format
        const IssueSchema = z.object({
          newOrExistingFile: z.enum(["new", "existing"]).optional().nullable(),
          title: z.string(),
          body: z.string(),
        });

        // Type for the expected issue details parsed from the text block
        type Issue = z.infer<typeof IssueSchema>;
        const userPrompt = `Extract the title and body from the following GitHub issue text block:
        \`\`\`
        ${issueText}
        \`\`\`
        First, use this information to determine if this issue is for creating a new file or editing an existing file. It is CRITICAL that you do this BEFORE proceeding with any other steps.
        It is critical that the body is a copy of ALL of the information from the issue, including all markdown formatting, code, examples, etc. 
        If the issue is a task to create a single new file, the title MUST be in the following format: "Create new file => /path/to/file/new_filename.ext".
        Your output MUST be in the format of a JSON object with the title and description fields that adheres to the IssueSchema. 
        `;

        const systemPrompt =
          "## Instructions\n" +
          "Your response MUST be in the format of a JSON object that adheres to the following Zod schema:\n" +
          "const IssueSchema = z.object({\n" +
          "  newOrExistingFile: z.enum(['new', 'existing']), // Indicate whether the task is to create a new file or edit an existing file.\n" +
          "  title: z.string(), // The title of the GitHub issue. If this is a new file, you MUST follow the format: 'Create new file => /path/to/file/new_filename.ext'.\n" +
          "  body: z.string(), // Copy the ENTIRED DETAILED GitHub issue body as the description. Use Markdown.\n" +
          "});\n" +
          "REMEMBER: The title MUST be in the format 'Create new file => /path/to/file/new_filename.ext' if this is a new file task.\n" +
          "Please provide ONLY an object with the title and description based on the GitHub issue text provided. If there is any extra information or if you do not provide an object that is parsable and passes Zod schema validation for the IssueSchema schema, the system will crash.\n";

        const temperature = 0.1;

        const issueData = (await sendGptRequestWithSchema(
          userPrompt,
          systemPrompt,
          IssueSchema,
          temperature,
        )) as unknown as Issue;

        // Add the @jacob-ai-bot tag to the issue body
        issueData.body += "\n\n@jacob-ai-bot";

        return issueData;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Internal server error",
        });
      }
    }),
});
