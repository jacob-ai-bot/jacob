import { type Research } from "@/types";
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
      "claude-3-5-sonnet-20241022",
      false,
    );

    return summary ?? "Unable to generate research summary.";
  } catch (error) {
    console.error("Error generating research summary:", error);
    return "Error generating research summary.";
  }
}
