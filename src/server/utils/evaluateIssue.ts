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
- Specific risk areas.
- Approximate number of story points for a human developer to complete this task, specifying the skill set needed.
- Recommendations for improving success probability.
- Several sentences of feedback on how to improve the plan to get a better confidence score
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
  "confidenceScore": number,
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
