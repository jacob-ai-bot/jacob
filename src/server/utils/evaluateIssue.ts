import { z } from "zod";
import { sendGptRequestWithSchema } from "../openai/request";
import type { BaseEventData } from "../utils";

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
    time: z.string(),
    requiredSkillLevel: z.string(),
    skillset: z.array(z.string()),
  }),
  recommendations: z.array(z.string()),
  feedback: z.string(),
  overallIndicator: z.enum(["Red", "Yellow", "Green"]),
});

export type Evaluation = z.infer<typeof EvaluationSchema>;

export async function evaluateIssue(
  todoDescription: string,
  planDetails: string,
  research: string,
  totalFiles: number,
  affectedFiles: number,
  baseEventData?: BaseEventData,
): Promise<Evaluation> {
  const systemPrompt = `You are an expert software architect and technical evaluator. Your task is to analyze the given coding task and provide a detailed evaluation of its feasibility for AI completion. Consider all aspects including technical complexity, historical performance, and potential risks. Provide specific, actionable insights and a confidence score.`;

  const userPrompt = `Based on the following information:

- Task Description: ${todoDescription}
- Generated Plan: ${planDetails}
- Provided Research: ${research}
- Codebase Metrics:
  - Number of Total Files: ${totalFiles}
  - Number of Affected Files: ${affectedFiles}

Provide a comprehensive evaluation including:

- Overall confidence score (0-5) using the provided rubric.
- Breakdown of complexity factors.
- Specific risk areas.
- Approximate number of story points and/or time for a human developer to complete this task, specifying the level of developer and skill set needed.
- Recommendations for improving success probability.
- Several sentences of feedback on how to improve the plan to get a better confidence score
- Red/Yellow/Green high-level indicator of the overall score.

Use the following rubric to guide your evaluation:

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
    "time": string,
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
    0.2,
    baseEventData,
    3,
    "gpt-4o-2024-08-06",
  );

  return evaluation;
}
