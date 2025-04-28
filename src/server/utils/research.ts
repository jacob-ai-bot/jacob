import { type Research } from "~/types";
import { sendGptRequest } from "../openai/request";
import { type BaseEventData } from "../utils";

export async function getResearchSummary(
  research: Research[],
  baseEventData?: BaseEventData,
): Promise<string> {
  if (!research || research.length === 0) {
    return "No research data available.";
  }

  const researchSummaryPrompt = `Please provide a concise summary of the following research findings:

${research
  .map(
    (item) => `
Question: ${item.question}
Answer: ${item.answer}
Type: ${item.type}
`,
  )
  .join("\n")}

Provide a clear, actionable summary that highlights the key findings and insights from this research. Focus on the most important points that would help a developer understand the research quickly.`;

  const systemPrompt = `You are an expert technical analyst who excels at synthesizing complex research data into clear, actionable summaries. Your summaries are:
- Concise and focused on key points
- Well-structured and easy to scan
- Highlight actionable insights
- Technical but accessible
- Prioritize the most important findings`;

  try {
    const summary = await sendGptRequest(
      researchSummaryPrompt,
      systemPrompt,
      0.3,
      baseEventData,
      3,
      30000,
      null,
      "claude-3-7-sonnet-20250219",
      false,
    );

    return summary ?? "Unable to generate research summary.";
  } catch (error) {
    console.error("Error generating research summary:", error);
    return "Error generating research summary.";
  }
}

export function generateCustomAISystemPrompt(research: Research[]): string {
  if (!research || research.length === 0) {
    return "You are a helpful AI assistant focused on writing clean, maintainable code.";
  }

  const architectureResearch = research.filter((item) =>
    item.question.toLowerCase().includes("architecture"),
  );
  const stateResearch = research.filter((item) =>
    item.question.toLowerCase().includes("state"),
  );
  const apiResearch = research.filter((item) =>
    item.question.toLowerCase().includes("api"),
  );
  const standardsResearch = research.filter((item) =>
    item.question.toLowerCase().includes("standards"),
  );
  const testingResearch = research.filter((item) =>
    item.question.toLowerCase().includes("testing"),
  );

  const prompt = `You are an expert software engineer who specializes in writing high-quality, production-ready code that perfectly matches the project's established patterns and practices. You have deep knowledge of this project's specific requirements and conventions:

ARCHITECTURE:
${architectureResearch
  .map(
    (item) => `- ${item.answer.split(".")[0]}.
`,
  )
  .join("")}

STATE MANAGEMENT:
${stateResearch
  .map(
    (item) => `- ${item.answer.split(".")[0]}.
`,
  )
  .join("")}

API PATTERNS:
${apiResearch
  .map(
    (item) => `- ${item.answer.split(".")[0]}.
`,
  )
  .join("")}

CODING STANDARDS:
${standardsResearch
  .map(
    (item) => `- ${item.answer.split(".")[0]}.
`,
  )
  .join("")}

TESTING REQUIREMENTS:
${testingResearch
  .map(
    (item) => `- ${item.answer.split(".")[0]}.
`,
  )
  .join("")}

When writing code, you must:
- Follow the established architectural patterns exactly
- Match existing code style and naming conventions
- Use the designated state management approaches
- Follow the project's API communication patterns
- Adhere to all coding standards and best practices
- Include appropriate error handling
- Write clean, maintainable, and well-documented code
- Consider performance and scalability
- Follow security best practices

Your goal is to write code that seamlessly integrates with the existing codebase while maintaining the highest standards of quality and consistency.`;

  return prompt;
}
