import { z } from "zod";
import { Octokit } from "@octokit/rest";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

import {
  cloneAndGetSourceMap,
  getAllRepos,
  getExtractedIssue,
  validateRepo,
} from "../utils";
import { AT_MENTION } from "~/server/utils";
import {
  sendGptRequestWithSchema,
  sendGptRequest,
} from "~/server/openai/request";
import { db } from "~/server/db/db";

export async function fetchGithubFileContents(
  accessToken: string,
  org: string,
  repo: string,
  branch: string,
  filePaths: string[],
) {
  try {
    const octokit = new Octokit({ auth: accessToken });

    const fileContents = await Promise.all(
      filePaths.map(async (path) => {
        try {
          const response = await octokit.repos.getContent({
            owner: org,
            repo,
            path,
            ref: branch,
          });

          if (!("content" in response.data)) {
            throw new Error(`File not found: ${path}`);
          }

          const content = Buffer.from(response.data.content, "base64").toString(
            "utf-8",
          );
          return { path, content };
        } catch (error) {
          console.error(`Error fetching file: ${path}`, error);
          return { path, error: `Failed to fetch file: ${path}` };
        }
      }),
    );

    return fileContents;
  } catch (error) {
    console.error("Error in fetchGithubFileContents", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch file contents from GitHub",
    });
  }
}

export const githubRouter = createTRPCRouter({
  getRepos: protectedProcedure
    .input(z.object({ includeProjects: z.boolean().optional() }).optional())
    .query(
      async ({
        input,
        ctx: {
          session: { accessToken },
        },
      }) => {
        return await getAllRepos(accessToken, input?.includeProjects);
      },
    ),
  getGithubAppName: protectedProcedure.query(async () => {
    return process.env.GITHUB_APP_NAME;
  }),
  getIssueTitleAndBody: protectedProcedure // TODO: deprecate this
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
          data: { id, number },
        } = await octokit.issues.create({
          owner: repoOwner,
          repo: repoName,
          title,
          body,
        });

        return { id, number };
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
  fetchFileContents: protectedProcedure
    .input(
      z.object({
        org: z.string(),
        repo: z.string(),
        branch: z.string().optional().default("main"),
        filePaths: z.array(z.string()),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { org, repo, branch, filePaths } = input;
      const { accessToken } = ctx.session;

      return await fetchGithubFileContents(
        accessToken,
        org,
        repo,
        branch,
        filePaths,
      );
    }),
  getIssue: protectedProcedure
    .input(z.object({ issueId: z.number(), org: z.string(), repo: z.string() }))
    .query(
      async ({
        input: { issueId, org, repo },
        ctx: {
          session: { accessToken },
        },
      }) => {
        try {
          console.log("Getting issue", issueId);
          const octokit = new Octokit({ auth: accessToken });

          if (!org || !repo) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invalid request",
            });
          }

          console.log("Getting issue", issueId);
          const { data: issue } = await octokit.issues.get({
            owner: org,
            repo,
            issue_number: issueId,
          });

          return {
            title: issue.title ?? "",
            body: issue.body ?? "",
          };
        } catch (error) {
          console.error("Error fetching issue:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Internal server error",
          });
        }
      },
    ),
  evaluateIssue: protectedProcedure
    .input(z.object({ repo: z.string(), title: z.string(), body: z.string() }))
    .mutation(
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

        const project = await db.projects.findBy({
          repoFullName: repo,
        });
        const codebaseContext = await db.codebaseContext
          .where({ projectId: project?.id })
          .order({ filePath: "ASC" })
          .all();
        if (codebaseContext.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Codebase context not found",
          });
        }
        const extractedIssue = await getExtractedIssue(
          `${codebaseContext.map((c) => `${c.filePath}: ${c.context.overview} ${c.context.diagram} `).join("\n")}`,
          issueText,
          "o1-mini-2024-09-12",
        );
        if (!extractedIssue) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Issue not found",
          });
        }

        return { extractedIssue };
      },
    ),
  rewriteIssue: publicProcedure
    .input(
      z.object({
        title: z.string(),
        body: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const prompt = `
  You are an expert GitHub issue reviewer and writer. Your task is to analyze the given issue draft, provide specific feedback on how to improve it, and then rewrite it to create a top 1% quality GitHub issue. Use the provided information to craft a detailed, well-structured, and informative issue body using markdown.
  
  **Original Title**: ${input.title}
  **Original Body**:
  ${input.body}
  
  **Guidelines for creating an exceptional GitHub issue**:
  1. Start with a clear, concise title that summarizes the issue.
  2. Provide a detailed description of the problem or feature request.
  3. Include steps to reproduce the issue if applicable.
  4. Mention the expected outcome and the actual outcome.
  5. List any relevant error messages or logs.
  6. Use proper formatting, including headings, lists, and code blocks.
  7. Be courteous and professional in tone.
  
  **Instructions**:
  - First, analyze the original issue and identify any missing key components or areas that need improvement based on the guidelines above. Focus specifically on any information that is missing or unclear.
  - Provide your analysis in a very brief and actionable bullet-pointed list under the heading "**Feedback for Improvement**". DO NOT provide generic feedback, only very specific actionable feedback biased towards capturing any missing or unclear information. This section should have at most 5 bullet points.
  - Then, rewrite the issue incorporating all the necessary improvements. The final result should be comprehensive enough for a developer to understand and address the issue with only this information.
  - Provide the rewritten issue in markdown format, starting with the title as an H1 heading. It is critical that you follow this exact format as the output will be parsed programatically.
  
  ---
  
  **Feedback for Improvement**:
  
  - [Your feedback here]
  
  ---
  
  **Rewritten Issue**:

  - [Your rewritten issue here]

  ---

  `;

      const aiResponse =
        (await sendGptRequest(
          prompt,
          undefined,
          0.7,
          undefined,
          3,
          undefined,
          undefined,
          "o1-mini-2024-09-12",
        )) ?? "";

      // Parse the AI response to separate feedback and rewritten issue
      const feedbackMatch = aiResponse.match(
        /(?<=\*\*Feedback for Improvement\*\*:\n)([\s\S]*?)(?=\n---)/,
      );
      const rewrittenIssueMatch = aiResponse.match(
        /(?<=\*\*Rewritten Issue\*\*:\n\n)([\s\S]*)/,
      );
      const feedback = feedbackMatch ? feedbackMatch[0].trim() : "";
      let rewrittenIssue = rewrittenIssueMatch
        ? rewrittenIssueMatch[0].trim()
        : "";

      if (!rewrittenIssue?.length) {
        rewrittenIssue = aiResponse ?? "";
      }

      return {
        feedback,
        rewrittenIssue,
      };
    }),
});
