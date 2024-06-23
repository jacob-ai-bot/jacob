import { z } from "zod";
import { Octokit } from "@octokit/rest";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

import {
  cloneAndGetSourceMap,
  getAllRepos,
  getExtractedIssue,
  validateRepo,
} from "../utils";
import { AT_MENTION } from "~/server/utils";
import { sendGptRequestWithSchema } from "~/server/openai/request";

export const githubRouter = createTRPCRouter({
  getRepos: protectedProcedure.input(z.object({}).optional()).query(
    async ({
      ctx: {
        session: { accessToken },
      },
    }) => {
      console.log("******accessToken", accessToken);
      return await getAllRepos(accessToken);
    },
  ),
  getIssueTitleAndBody: protectedProcedure
    .input(z.object({ repo: z.string(), title: z.string(), body: z.string() }))
    .query(
      async ({
        input: { repo, title, body },
        ctx: {
          session: { accessToken },
        },
      }) => {
        const [repoOwner, repoName] = repo?.split("/") ?? [];
        const issueText = `${title} ${body}`;
        if (!repoOwner || !repoName || !issueText?.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid request",
          });
        }
        await validateRepo(repoOwner, repoName, accessToken);

        const sourceMap = await cloneAndGetSourceMap(repo, accessToken);
        const extractedIssue = await getExtractedIssue(sourceMap, issueText);
        if (!extractedIssue) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Issue not found",
          });
        }
        if (extractedIssue.stepsToAddressIssue) {
          body += `\n\nSteps to Address Issue: ${extractedIssue.stepsToAddressIssue}`;
        }
        if (extractedIssue.filesToCreate?.length) {
          body += `\n\nFiles to Create: ${extractedIssue.filesToCreate.join(
            ", ",
          )}`;
        }
        if (extractedIssue.filesToUpdate?.length) {
          body += `\n\nFiles to Update: ${extractedIssue.filesToUpdate.join(
            ", ",
          )}`;
        }
        body += `\n\ntask assigned to: ${AT_MENTION}`;

        // if we're creating a new file, the task title must have an arrow (=>) followed by the name of the new file to create
        // i.e. "Create a new file => new-file-name.js"
        let newTitle = extractedIssue.commitTitle ?? "New Issue";
        if (extractedIssue.filesToCreate?.length && !title.includes("=>")) {
          newTitle += ` => ${extractedIssue.filesToCreate[0]}`;
        }
        return { title: newTitle, body };
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
    .input(z.object({ messages: z.string() }))
    .query(async ({ input: { messages } }) => {
      try {
        // Define a Zod schema for the expected response format
        const IssueSchema = z.object({
          newOrExistingFile: z.enum(["new", "existing"]).optional().nullable(),
          title: z.string(),
          body: z.string(),
        });

        // Type for the expected issue details parsed from the text block
        type Issue = z.infer<typeof IssueSchema>;
        const userPrompt = `Extract the title and body from the following messages that contain a GitHub issue:
        \`\`\`
        ${messages}
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
        issueData.body += `\n\n${AT_MENTION}`;

        return issueData;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Internal server error",
        });
      }
    }),
  getSourceMap: protectedProcedure
    .input(
      z.object({
        org: z.string(),
        repo: z.string(),
      }),
    )
    .query(
      async ({
        input: { org, repo },
        ctx: {
          session: { accessToken },
        },
      }) => {
        if (!org || !repo) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid request",
          });
        }
        await validateRepo(org, repo, accessToken);
        return await cloneAndGetSourceMap(`${org}/${repo}`, accessToken);
      },
    ),
});
