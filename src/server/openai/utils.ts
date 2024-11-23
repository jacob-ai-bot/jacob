import type OpenAI from "openai";
import { sendGptRequestWithSchema, type Model } from "./request";
import { type BaseEventData } from "../utils";
import { sendGptRequest } from "./request";
import { z } from "zod";

export const EvaluationSchema = z.object({
  evaluation: z.string().nullable().optional(), // a detailed, multi-paragraph evaluation based on how closely the output adheres to these original instructions, and how well the output addresses the original GitHub issue.
  unrelatedCodeChanges: z.string().nullable().optional(), // a list of the unrelated code changes such as removed comments or other unrelated code additions or removals
  summary: z.string().nullable().optional(), // a brief summary of the evaluation
  rating: z.number().nullable().optional(), // a final rating of the response from 1 to 5
});

export type EvaluationInfo = z.infer<typeof EvaluationSchema>;

export const evaluate = async (
  response: string,
  userPrompt: string,
  systemPrompt: string,
  baseEventData: BaseEventData | undefined,
  models: Model[] = ["claude-3-5-sonnet-20241022"],
): Promise<EvaluationInfo[]> => {
  const bestSystemPrompt = `You are the top, most distinguished Technical Fellow at Microsoft. You must evaluate this GPT-generated output and determine its quality. Pay special attention to the instructions that were given in the prompt. Your evaluation will be based on how closely the output adheres to these original instructions, and how well the output addresses the original GitHub issue. 
  If this is a code change, your evaluation should specifically note if the code adheres to the exit criteria (if given), is typed properly (if needed), and ONLY makes the minimal number of changes necessary to address the issue. Check to ensure the code file was not cut off prematurely. Deduct points if comments are removed or added that are not related to the issue.
  Provide a brief summary of the evaluation and a final rating of the response from 1 to 5. Round to the nearest 0.1. Reserve 5.0 for only the most perfect responses, and use it sparingly.

  export const EvaluationSchema = z.object({
    evaluation: z.string(), // a detailed, multi-paragraph evaluation based on how closely the output adheres to these original instructions, and (if applicable) how well the output addresses the original GitHub issue.
    unrelatedCodeChanges: z.string(), // a brief list of the unrelated code changes such as removed comments or other unrelated code additions or removals. If this is a text response or there are no unrelated code changes, say "None".
    summary: z.string(), // a brief summary of the evaluation
    rating: z.number().min(1.0).max(5.0), // a final rating of the response from 1.0 to 5.0 (1.0 is bad, 2.0 is OK, 3.0 is good, 4.0 is excellent. You should ONLY use 5.0 if the response is absolutely perfect, but reserve it for rare cases only.)
  });
  ## INSTRUCTIONS
  Review the original user prompt, system prompt, and response. Evaluate how well the response adheres to the original user prompt and system prompt. Provide a detailed, multi-paragraph evaluation based on how closely the output adheres to these original instructions, and how well the output addresses the original GitHub issue. Provide a brief summary of the evaluation and a final rating of the response from 1 to 5.
  Your response MUST adhere exactly to the EXACT format provided in the EvaluationSchema schema or the system will crash.`;

  const bestUserPrompt = `
    ## USER PROMPT
    ${userPrompt}

    ## SYSTEM PROMPT
    ${systemPrompt}
  
    ## RESPONSE
    ${response}

    ## INSTRUCTIONS 
    Review the original user prompt, system prompt, and response. Evaluate how well the response addresses the original user prompt and system prompt. Provide a detailed, multi-paragraph evaluation based on how closely the output adheres to these original instructions, and how well the output addresses the original GitHub issue. Note any unrelated code changes if needed, provide a brief summary of the evaluation and a final rating of the response from 1 to 5.
    Your response MUST be in JSON format and adhere exactly to the EXACT format provided in the EvaluationSchema schema or the system will crash.`;

  // Evaluate using each model, then return the average the scores

  const evaluationPromises = models.map(
    (model) =>
      sendGptRequestWithSchema(
        bestUserPrompt,
        bestSystemPrompt,
        EvaluationSchema,
        0.2,
        baseEventData,
        1,
        model,
      ) as Promise<EvaluationInfo>,
  );

  return Promise.all(evaluationPromises);
};

export const sendSelfConsistencyChainOfThoughtGptRequest = async (
  userPrompt: string,
  systemPrompt = "You are a helpful assistant.",
  temperature = 0.2,
  baseEventData: BaseEventData | undefined = undefined,
  retries = 3,
  delay = 60000,
  imagePrompt: OpenAI.Chat.ChatCompletionMessageParam | null = null,
  // models: Model[] = [
  //   "claude-3-5-sonnet-20241022",
  //   "gpt-4o-2024-05-13",
  //   "gemini-1.5-pro-latest",
  //   "gpt-4-0125-preview",
  // ],
  models: Model[] = [
    "claude-3-5-sonnet-20241022",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-sonnet-20241022",
    // "gemini-1.5-pro-exp-0801",
  ],
  minTemperature = 0.1,
  maxTemperature = 0.5,
): Promise<string | null> => {
  try {
    const numRequests = models.length;
    const initialPromises = Array.from({ length: numRequests }, (_, i) => {
      const temperature =
        Math.round(
          (Math.random() * (maxTemperature - minTemperature) + minTemperature) *
            100,
        ) / 100;
      return sendGptRequest(
        `${i}: ${userPrompt}`, // ensure it's not cached
        systemPrompt,
        temperature,
        baseEventData,
        0, // note that we are only doing one request per model and ignoring any errors for a single model
        delay,
        imagePrompt,
        models[i % models.length],
      )
        .then((response) => ({
          response,
          model: models[i % models.length],
          temperature,
        }))
        .catch((error) => {
          console.error(error);
          return null; // or some other default value
        });
    });

    const initialResults = await Promise.all(initialPromises);
    const validResults = initialResults.filter((result) => !!result?.response);

    const evaluationPromises = validResults.map((result) => {
      if (result) {
        return evaluate(
          result?.response ?? "",
          userPrompt,
          systemPrompt,
          baseEventData,
        )
          .then((evaluations) => ({
            response: result?.response,
            model: result.model,
            temperature: result.temperature,
            evaluations,
          }))
          .catch((error) => {
            console.error(error);
            return null;
          });
      } else {
        return null;
      }
    });

    const evaluationResults = await Promise.all(evaluationPromises);
    const validEvaluationResults = evaluationResults.filter(
      (e): e is NonNullable<typeof e> => e !== null,
    );

    const bestEvaluation = validEvaluationResults.reduce((best, current) => {
      const currentAvgRating =
        current.evaluations.reduce((sum, e) => sum + (e.rating ?? 0), 0) /
        current.evaluations.length;
      const bestAvgRating =
        best.evaluations.reduce((sum, e) => sum + (e.rating ?? 0), 0) /
        best.evaluations.length;
      return currentAvgRating > bestAvgRating ? current : best;
    });

    if (!bestEvaluation) {
      throw new Error("No valid evaluations");
    }
    const bestAvgRating =
      bestEvaluation.evaluations.reduce((sum, e) => sum + (e.rating ?? 0), 0) /
      bestEvaluation.evaluations.length;
    console.log(`
      *** Best Evaluation ***
      Model: ${bestEvaluation.model}
      Temperature: ${bestEvaluation.temperature}
      Average Rating: ${bestAvgRating}
    `);
    if (bestAvgRating <= 3) {
      // Now use the information from the evaluations to improve the output.
      const updatePrompt = `
    Original response:
    ${bestEvaluation.response}
    
    Evaluations:
    ${bestEvaluation.evaluations
      .map(
        (e, index) => `
    Evaluation ${index + 1}:
    ${e.evaluation}
    Unrelated Code Changes: ${e.unrelatedCodeChanges}
    Summary: ${e.summary}
    Rating: ${e.rating}
    `,
      )
      .join("\n")}
    
    Please update the original response to address the specific issues mentioned in these evaluations. Maintain the overall structure and intent of the original response, but improve it based on the feedback provided. Ensure to address any unrelated code changes mentioned. ONLY output the new response, do not comment on the changes or include any other information.
    `;

      // Send the update request to the LLM
      const updatedResponse = await sendGptRequest(
        updatePrompt,
        systemPrompt,
        bestEvaluation.temperature,
        baseEventData,
        3,
        60000,
        undefined,
        bestEvaluation.model,
      );

      return updatedResponse;
    } else {
      return bestEvaluation.response;
    }
  } catch (error) {
    if (retries > 0) {
      return sendSelfConsistencyChainOfThoughtGptRequest(
        userPrompt,
        systemPrompt,
        temperature,
        baseEventData,
        retries - 1,
        delay,
        imagePrompt,
        models,
        minTemperature,
        maxTemperature,
      );
    } else {
      throw error;
    }
  }
};
