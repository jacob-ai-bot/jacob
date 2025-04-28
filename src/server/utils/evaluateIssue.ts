import { z } from "zod";
import { sendGptRequestWithSchema } from "../openai/request";
import type { BaseEventData } from "../utils";
import { type ContextItem } from "./codebaseContext";
import { type PlanStep } from "../db/tables/planSteps.table";
import { PlanningAgentActionType } from "../db/enums";

const EvaluationSchema = z.object({
  confidenceScore: z.number().min(0).max(5),
  complexityFactors: z.object({
    codeComplexity: z.enum(["Low", "Medium", "High"]),
    contextUnderstanding: z.enum(["Low", "Medium", "High"]),
    riskFactors: z.enum(["Low", "Medium", "High"]),
  }),
  specificRiskAreas: z.array(z.string()),
  estimatedEffort: z.object({
    storyPoints: z.number(),
    requiredSkillLevel: z.string(),
    skillset: z.array(z.string()),
  }),
  recommendations: z.array(z.string()),
  feedback: z.string(),
  overallIndicator: z.enum(["Red", "Yellow", "Green"]),
});

export type Evaluation = z.infer<typeof EvaluationSchema>;

const JiraEvaluationSchema = z.object({
  score: z.number().min(1).max(5),
  feedback: z.string().optional(),
});

export type JiraEvaluation = z.infer<typeof JiraEvaluationSchema>;

export async function evaluateIssue({
  githubIssue,
  planSteps,
  research,
  totalFiles,
  contextItems,
  baseEventData,
}: {
  githubIssue: string;
  planSteps: PlanStep[];
  research: string;
  totalFiles: number;
  contextItems: ContextItem[];
  baseEventData?: BaseEventData;
}): Promise<Evaluation> {
  const planDetails = planSteps.map((step) => step.instructions).join("\n");
  const filePathsToEdit =
    planSteps
      ?.filter((s) => s.type == PlanningAgentActionType.EditExistingCode)
      .map((s) => s.filePath) ?? [];

  const filesToEdit = contextItems
    ?.filter((c) => filePathsToEdit.includes(c.file))
    .map(
      (c) =>
        `File: ${c.file}\n${c.code?.map((code) => code.trim()).join("\n")}`,
    )
    .join("\n\n");

  const systemPrompt = `You are an expert software architect and technical evaluator. Your task is to analyze the given GitHub issue and a plan to complete the issue. Provide a detailed evaluation of its feasibility for AI completion.
  Here is some background research that was done on the issue:
  <research>
  ${research}
  </research>
  And (if applicable) here are the existing files that will be edited:
  <filesToEdit>
  ${filesToEdit}
  </filesToEdit>
Key points to consider when evaluating complexity:
- Issue description clarity:
  A well-defined issue with clear steps to reproduce and expected behavior is easier to understand and implement than a vague or ambiguous one.
- Scope of impact:
Does the issue affect a small part of the system or a large, critical functionality?
- Technical complexity:
  Does the fix require deep knowledge of specific system components, complex algorithms, or intricate interactions?
- Dependencies:
  How many other features or components are potentially impacted by the change?
- Testing requirements:
  How extensive are the testing needs to validate the fix?
  You will be given a GitHub issue and a proposal for a plan to address this issue. You must provide a detailed evaluation of the plan's feasibility for AI completion. Consider all aspects including clarity of the issue description, technical complexity, potential risks and how well the plan details address the task. Provide specific, actionable insights and a confidence score.`;

  const userPrompt = `Based on the following information:

- GitHub Issue: 
<githubIssue>
${githubIssue}
</githubIssue>
- Plan Proposal: 
<planProposal>
${planDetails}
</planProposal>
- Codebase Metrics:
  - Number of Total Files: ${totalFiles}
  - Number of Files to Edit: ${filePathsToEdit.length}
  - Number of Files to Create: ${
    planSteps.filter((s) => s.type == PlanningAgentActionType.CreateNewCode)
      .length
  }

Provide a comprehensive evaluation including:

- Overall confidence score that an AI can successfully complete the task (0-5) using the provided rubric.
- Breakdown of complexity factors.
- Specific risk areas. Don't overcomplicate, keep it concise and focused on risks that are common in a medium-sized codebase with a small team. Don't mention every single risk, just the most common ones. If there are none, just say so.
- Approximate number of story points for a human developer to complete this task, specifying the skill set needed.
- Recommendations for improving success probability. Keep the recommendations concise and actionable, don't overcomplicate.
- Several sentences of feedback on how to improve the plan to get a better confidence score. Again, keep it concise and actionable but don't make it complicated. If the plan is already good, just say so.
- Red/Yellow/Green high-level indicator of the overall score.

Use the following AI Coding Confidence Score Rubric to guide your evaluation:

Confidence Score Rubric:
0-1: Extremely low confidence, high risk of failure
1-2: Low confidence, significant challenges expected
2-3: Moderate confidence, some challenges but potentially feasible
3-4: Good confidence, likely to succeed with some effort
4-5: High confidence, highly likely to succeed with minimal issues

Complexity Factors:
- Code Complexity: Consider the number of files affected, cyclomatic complexity, and integration points
- Context Understanding: Evaluate the clarity of the issue description, completeness of acceptance criteria, and availability of relevant examples
- Risk Factors: Assess external dependencies, state management requirements, UI/UX complexity, performance implications, and security considerations

Please provide your evaluation in the following JSON format:

{
  "confidenceScore": number, // use half-point increments i.e. [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]
  "complexityFactors": {
    "codeComplexity": "Low" | "Medium" | "High",
    "contextUnderstanding": "Low" | "Medium" | "High",
    "riskFactors": "Low" | "Medium" | "High"
  },
  "specificRiskAreas": string[],
  "estimatedEffort": {
    "storyPoints": number,
    "requiredSkillLevel": string,
    "skillset": string[]
  },
  "recommendations": string[],
  "feedback": string,
  "overallIndicator": "Red" | "Yellow" | "Green"
}`;

  const evaluation = await sendGptRequestWithSchema(
    userPrompt,
    systemPrompt,
    EvaluationSchema,
    0.4,
    baseEventData,
    3,
    "claude-3-7-sonnet-20250219",
  );

  return evaluation;
}

export async function evaluateJiraIssue({
  title,
  description,
}: {
  title: string;
  description: string;
}): Promise<JiraEvaluation> {
  const systemPrompt = `You are an expert software architect and technical evaluator. Your task is to analyze the given Jira issue and provide an evaluation of its suitability for AI completion.
Provide a score between 1 and 5 (half-point increments allowed) indicating how likely it is that an AI coding agent will be able to complete the task. Note that more information will be coming, but there needs to be at least some details to make it actionable. If the score is less than 4, provide a one-sentence feedback message informing the user what needs to be changed to make the ticket actionable by the AI agent.
Evaluation Criteria:
- Clarity of the issue description
- Technical complexity
- Completeness of requirements
- Feasibility for AI completion

`;

  const userPrompt = `Analyze the following Jira issue:
Title: "${title}"
Description: "${description}"

Respond with a JSON object in the following format:
{
  "score": number, // between 1 and 5, half-points allowed
  "feedback": string // optional, include only if score < 4
}
  
Examples:
Title: "Fix the bug"
Description: ""

Response: 
{
  "score": 1,
  "feedback": "The issue description is too vague, please provide more details"
}

Title: "Fix the bug in the login page"
Description: "The login page is not working"
Response: 
{
  "score": 3,
  "feedback": "There is some information about the issue, but more would be helpful. For example, it would be helpful to know what went wrong and what the expected behavior is."
}

Title: "Fix the bug in the login page"
Description: "When the user enters their email and it is invalid, the error message shown is incorrect. It says "Invalid password" instead of "Invalid email address"."
Response: 
{
  "score": 5,
  "feedback": ""
}
`;

  const evaluation = await sendGptRequestWithSchema(
    userPrompt,
    systemPrompt,
    JiraEvaluationSchema,
    0.2,
  );

  return evaluation;
}
