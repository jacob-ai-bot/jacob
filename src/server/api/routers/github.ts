import { z } from "zod";
import { Octokit } from "@octokit/rest";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

import {
  cloneAndGetSourceMap,
  getAllRepos,
  getExtractedIssue,
  checkAndEnableIssues,
  getCodebaseContext,
} from "../utils";
import { rewriteGitHubIssue } from "~/server/github/issue";
import { AT_MENTION } from "~/server/utils";
import { sendGptRequestWithSchema } from "~/server/openai/request";
import { type CodeFile } from "~/app/dashboard/[org]/[repo]/chat/components/Chat";
import { EvaluationMode } from "~/types";

export async function fetchGithubFileContents(
  accessToken: string,
  org: string,
  repo: string,
  branch: string,
  filePaths: string[],
  shouldThrow = true,
) {
  try {
    const octokit = new Octokit({ auth: accessToken });

    const fileContents = await Promise.all(
      filePaths.map(async (path) => {
        try {
          console.log(
            `fetching file from GitHub: ${path} with branch: ${branch}`,
          );
          const response = await octokit.repos.getContent({
            owner: org,
            repo,
            path,
            ref: branch,
          });

          if (!("content" in response.data)) {
            if (shouldThrow) {
              throw new Error(`File not found: ${path}`);
            }
            return { path, content: undefined };
          }

          const content = Buffer.from(response.data.content, "base64").toString(
            "utf-8",
          );
          return { path, content } as CodeFile;
        } catch (error) {
          console.error(`Error fetching file: ${path}`, error);
          if (shouldThrow) {
            throw new Error(`Failed to fetch file: ${path}`);
          }
          return { path, content: undefined } as CodeFile;
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
        shouldThrow: z.boolean().optional().default(true),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { org, repo, branch, filePaths, shouldThrow } = input;
      const { accessToken } = ctx.session;

      try {
        return await fetchGithubFileContents(
          accessToken,
          org,
          repo,
          branch,
          filePaths,
          shouldThrow,
        );
      } catch (error) {
        console.error("Error fetching file contents:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Internal server error",
        });
      }
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

          console.log("Getting issue from GitHub...", issueId);
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

        const codebaseContext = await getCodebaseContext(
          repoOwner,
          repoName,
          accessToken,
        );
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
  rewriteIssue: protectedProcedure
    .input(
      z.object({
        org: z.string(),
        repo: z.string(),
        title: z.string(),
        body: z.string(),
        evaluationMode: z
          .nativeEnum(EvaluationMode)
          .optional()
          .default(EvaluationMode.DETAILED),
      }),
    )
    .mutation(
      async ({
        input: { org, repo, title, body, evaluationMode },
        ctx: {
          session: { accessToken },
        },
      }) => {
        try {
          return await rewriteGitHubIssue(
            accessToken,
            org,
            repo,
            title,
            body,
            evaluationMode,
          );
        } catch (error) {
          console.error("Error rewriting issue:", error);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Error rewriting issue: ${String(error ?? "")}`,
          });
        }
      },
    ),
  verifyAndEnableIssues: protectedProcedure
    .input(z.object({ org: z.string(), repo: z.string() }))
    .mutation(
      async ({
        input: { org, repo },
        ctx: {
          session: { accessToken },
        },
      }) => {
        try {
          const result = await checkAndEnableIssues(org, repo, accessToken);
          return { success: result.success, message: result.message };
        } catch (error) {
          console.error("Error verifying and enabling issues:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Internal server error",
          });
        }
      },
    ),
  getBranches: protectedProcedure
    .input(
      z.object({
        org: z.string(),
        repo: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { org, repo } = input;
      const { accessToken } = ctx.session;

      try {
        const octokit = new Octokit({ auth: accessToken });

        // Get repository info to find default branch
        const { data: repoInfo } = await octokit.repos.get({
          owner: org,
          repo,
        });

        // Get all branches
        const { data: branches } = await octokit.repos.listBranches({
          owner: org,
          repo,
          per_page: 100,
        });

        // Reorder branches to put default branch first
        const defaultBranch = branches.find(
          (branch) => branch.name === repoInfo.default_branch,
        );
        const otherBranches = branches.filter(
          (branch) => branch.name !== repoInfo.default_branch,
        );

        return [
          defaultBranch?.name ?? repoInfo.default_branch,
          ...otherBranches.map((branch) => branch.name),
        ];
      } catch (error) {
        console.error("Error fetching branches:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch repository branches",
        });
      }
    }),
  createBranch: protectedProcedure
    .input(
      z.object({
        org: z.string(),
        repo: z.string(),
        branchName: z.string(),
        baseBranch: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { org, repo, branchName, baseBranch } = input;
      const { accessToken } = ctx.session;

      try {
        const octokit = new Octokit({ auth: accessToken });

        // Get the SHA of the latest commit on the base branch
        const { data: baseRef } = await octokit.git.getRef({
          owner: org,
          repo,
          ref: `heads/${baseBranch}`,
        });

        // Create the new branch
        await octokit.git.createRef({
          owner: org,
          repo,
          ref: `refs/heads/${branchName}`,
          sha: baseRef.object.sha,
        });

        return { success: true, message: "Branch created successfully" };
      } catch (error) {
        console.error("Error creating branch:", error);
        if (error instanceof Error && error.message.includes("422")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Branch already exists or invalid branch name",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create branch",
        });
      }
    }),
});
