import { dedent } from "ts-dedent";
import { Octokit } from "@octokit/rest";
import type { Repository } from "@octokit/webhooks-types";

import { PRCommand } from "../utils";
import { type Model, sendGptRequest } from "../openai/request";
import { EvaluationMode } from "~/types";
import { getCodebaseContext } from "../api/utils";
import type OpenAI from "openai";

export const codeReviewCommandSuggestion = `Please note: I am available to do code reviews in this repo if you add the comment \`${PRCommand.CodeReview}\` to a pull request.`;

export function addCommentToIssue(
  repository: Repository,
  issueOrPRNumber: number,
  token: string,
  body: string,
) {
  const octokit = new Octokit({
    auth: token,
    log: console,
    userAgent: "jacob",
  });

  return octokit.issues.createComment({
    owner: repository.owner.login,
    repo: repository.name,
    issue_number: issueOrPRNumber,
    body,
  });
}

type SimpleOwner = Pick<Repository["owner"], "login">;
interface SimpleRepository {
  owner: SimpleOwner;
  name: string;
}

export async function getIssue(
  repository: SimpleRepository,
  token: string,
  issue_number: number,
) {
  const octokit = new Octokit({
    auth: token,
    log: console,
    userAgent: "jacob",
  });

  console.log("Getting issue from GitHub...", issue_number);
  return octokit.issues.get({
    owner: repository.owner.login,
    repo: repository.name,
    issue_number,
  });
}

export async function createRepoInstalledIssue(
  repository: Pick<Repository, "owner" | "name">,
  token: string,
  assignee?: string,
  isNodeRepo?: boolean,
  error?: Error,
) {
  const octokit = new Octokit({
    auth: token,
    log: console,
    userAgent: "jacob",
  });

  let body: string;
  if (error) {
    const errorString =
      (error as { message?: string })?.message ?? error.toString();
    body = dedent`
      JACoB here...
      I can now access this repo, but ran into trouble during my installation checks.
      ${
        isNodeRepo
          ? "I tried to verify that I could build this repo in preparation for writing code."
          : ""
      }
      
      Here is some additional info on the error(s) I saw:
      
      ${errorString}

      You may need to add or edit a \`jacob.json\` file in the root of your repository to help me better understand how to build your project.
    
      Please visit the [JACoB documentation](https://docs.jacb.ai) for more information on how to resolve this issue.
    `;
  } else {
    const limitations = isNodeRepo
      ? ""
      : dedent`
      ${codeReviewCommandSuggestion}
      At the moment, I can only write code for JavaScript and TypeScript projects.
      Check back soon for updates on additional language support.
      
    `;
    body = dedent`
      JACoB here...
      I can now access this repo${
        isNodeRepo ? " and build the project successfully" : ""
      }!

      ${limitations}
      
      Please visit the [JACoB documentation](https://docs.jacb.ai) for more information on how to get started with JACoB.
    `;
  }

  return octokit.issues.create({
    owner: repository.owner.login,
    repo: repository.name,
    title: "JACoB Installed",
    body,
    assignee,
  });
}

export async function createGitHubIssue(
  owner: string,
  repo: string,
  title: string,
  body: string,
  token: string,
) {
  const octokit = new Octokit({
    auth: token,
    log: console,
    userAgent: "jacob",
  });

  return octokit.issues.create({
    owner,
    repo,
    title,
    body,
  });
}

export async function rewriteGitHubIssue(
  accessToken: string,
  org: string,
  repo: string,
  title: string,
  body: string,
  evaluationMode: EvaluationMode,
  imageUrls: string[] = [],
  labels: string[] = [],
) {
  try {
    const issueText = `${title} ${body}`;
    if (!org || !repo || !issueText?.length) {
      throw new Error("Missing required parameters");
    }

    const codebaseContext = await getCodebaseContext(org, repo, accessToken);
    if (codebaseContext.length === 0) {
      throw new Error("Codebase context not found");
    }

    const structuredCodebaseContext = codebaseContext
      .map((c) => `${c.filePath}: ${c.context.overview}`)
      .join("\n");

    let model: Model =
      evaluationMode === EvaluationMode.FASTER
        ? "claude-3-5-sonnet-20241022"
        : "o1-preview-2024-09-12";
    if (imageUrls.length) {
      model = "gpt-4o-2024-08-06";
    }

    const prompt = `
You are an expert GitHub issue reviewer and writer. Your task is to analyze the given issue draft and rewrite it to create a top 1% quality GitHub issue. Use the provided codebase context to ensure accuracy and relevance.

**Codebase Context**:
${structuredCodebaseContext}
** END OF CODEBASE CONTEXT **


**Original Title**: ${title}
**Original Body**:
${body}


**Guidelines for creating an exceptional GitHub issue**:
1. Start with a clear, concise title that summarizes the issue.
2. Provide a detailed description of the problem or feature request. Do not make assumptions and do not leave out any information that the user has provided.
3. Mention the expected outcome if possible. Do not hallucinate an expected outcome or make assumptions.
4. Use proper formatting, including headings, lists, and code blocks.
5. Be courteous and professional in tone.
6. Only reference existing files and components from the provided codebase context. Only reference files if the user has explicitly mentioned them in the issue, do not make assumptions.
7. Only make suggestions for a fix or feature if the user has explicitly given ideas on how to fix the issue or implement the feature. Never suggest a fix if the user has not provided any ideas. If the user has provided a suggested fix or background information, always include it in your response.
8. The issue description should be detailed enough for a novice developer to understand the issue and have all of the information they need to address the issue.
9. Do not add in any reference links, URLs, or links to external resources.
10. Do not add in any code examples or code snippets. Do not add placeholders for screenshots or bug reports.
11. Unless specifically mentioned, do not add in any instructions for the user to run commands or tests.
12. The ideal output should be a comprehensive, detailed, and actionable issue that a developer can understand. Focus on the description of the issue and the expected outcome, not the solution or any reproduction steps.


**Instructions**:
- First, analyze the original issue and identify any missing key components or areas that need improvement based on the guidelines above. Focus specifically on any information that is missing or unclear.
- Provide your analysis in a detailed and actionable bullet-pointed list under the heading "**Feedback for Improvement**". DO NOT provide generic feedback, only very specific actionable feedback biased towards capturing any missing or unclear information. This section should have at most 5 bullet points.
- Next, take the original issue draft and rewrite it to create detailed, top 1% quality GitHub issue.
- Provide the rewritten issue in markdown format, starting with the title as an H1 heading. Provide the detailed description, followed by the expected outcome and any other relevant information. DO NOT exclude any relevant information from the original issue draft, just add more detail and make it look like a top 1% quality, professionally-authored GitHub issue.
- Ensure that only existing files and components from the codebase context are referenced.
- Keep the rewritten issue detailed and focused, avoiding unnecessary information.
- Note that your response is part of a larger process that will parse your response to extract the feedback and rewritten issue. It is critical that you follow the exact format outlined below as the output will be parsed programatically.
- Here is the code that will be used to parse your response:
\`\`\`
    const feedbackMatch = aiResponse.match(
      /(?<=\*\*Feedback for Improvement\*\*:\n+)([\s\S]*?)(?=\n---)/,
    );
    const rewrittenIssueMatch = aiResponse.match(
      /(?<=\*\*Rewritten Issue\*\*:\n+)([\s\S]*?)(?=\n---)/,
    );
\`\`\`
Here is the expected format of your response:
---

**Feedback for Improvement**:
- [Your feedback here]

---

**Rewritten Issue**:
- [Your rewritten issue here]

---
`;

    let imagePrompt: OpenAI.Chat.ChatCompletionMessageParam | undefined;
    if (imageUrls.length) {
      imagePrompt = {
        role: "user",
        content: imageUrls.map((url) => ({
          type: "image_url",
          image_url: {
            url,
            detail: "high",
          },
        })),
      } as OpenAI.Chat.ChatCompletionMessageParam;
    }

    const aiResponse =
      (await sendGptRequest(
        prompt,
        undefined,
        0.5,
        undefined,
        3,
        0,
        imagePrompt,
        model,
      )) ?? "";

    // Parse the AI response to separate feedback and rewritten issue
    const feedbackMatch = aiResponse.match(
      /(?<=\*\*Feedback for Improvement\*\*:\n+)([\s\S]*?)(?=\n---)/,
    );
    const rewrittenIssueMatch = aiResponse.match(
      /(?<=\*\*Rewritten Issue\*\*:\n+)([\s\S]*?)(?=\n---)/,
    );
    const feedback = feedbackMatch ? feedbackMatch[0].trim() : "";
    let rewrittenIssue = rewrittenIssueMatch
      ? rewrittenIssueMatch[0].trim()
      : "";

    if (!rewrittenIssue.length) {
      rewrittenIssue = aiResponse.trim();
    }

    // Append labels as hashtags
    if (labels.length > 0) {
      const hashtags = labels
        .map(
          (label) => "#" + label.replace(/[^\w\s]/gi, "").replace(/\s+/g, "-"),
        )
        .join(" ");
      rewrittenIssue += `\n\n${hashtags}`;
    }

    return {
      feedback,
      rewrittenIssue,
    };
  } catch (error) {
    console.error("Error rewriting issue:", error);
    throw new Error("Error rewriting issue");
  }
}
