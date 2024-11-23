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
  evaluationScore: z.number().min(1).max(5),
  feedback: z.string().nullable(),
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
    "claude-3-5-sonnet-20241022",
  );

  return evaluation;
}

export async function evaluateJiraIssue({
  title,
  description,
  baseEventData,
}: {
  title: string;
  description: string;
  baseEventData?: BaseEventData;
}): Promise<JiraEvaluation> {
  const systemPrompt = `You are an expert software requirements analyst. Your task is to evaluate the quality and completeness of a Jira issue to determine if it contains sufficient detail for an AI coding agent to implement successfully.

Key points to consider:
- Clarity of requirements
- Completeness of acceptance criteria
- Technical specificity
- Edge cases and error scenarios
- Dependencies and constraints

You will be given a Jira issue title and description. You must evaluate whether it contains enough detail for an AI to implement the feature or fix. Provide a score and feedback if improvements are needed.`;

  const userPrompt = `Please evaluate the following Jira issue:

Title: ${title}
Description:
${description}

Evaluate the issue quality and provide:
1. A score from 1-5 (using half-point increments) indicating how likely an AI can successfully implement this issue:
   - 5: Perfect, contains all necessary details
   - 4: Good, minor details missing but implementable
   - 3: Moderate, needs some clarification
   - 2: Poor, significant details missing
   - 1: Very poor, cannot be implemented as is

2. If the score is less than 4, provide ONE specific, actionable sentence of feedback explaining what needs to be added or clarified to make the issue implementable by an AI.

Format the response as a JSON object:
{
  "evaluationScore": number,
  "feedback": string | null  // null if score >= 4, otherwise a feedback message
}`;

  const evaluation = await sendGptRequestWithSchema(
    userPrompt,
    systemPrompt,
    JiraEvaluationSchema,
    0.4,
    baseEventData,
    3,
    "claude-3-5-sonnet-20241022",
  );

  return evaluation;
}
