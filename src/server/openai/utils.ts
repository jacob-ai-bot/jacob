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

const evaluate = async (
  response: string,
  userPrompt: string,
  systemPrompt: string,
  baseEventData: BaseEventData | undefined,
  models: Model[] = [
    "claude-3-5-sonnet-20240620",
    "gpt-4o-2024-05-13",
    "gemini-1.5-pro-latest",
  ],
): Promise<EvaluationInfo[]> => {
  const bestSystemPrompt = `You are the top, most distinguished Technical Fellow at Microsoft. You must evaluate this GPT-generated code output and determine its quality. Pay special attention to the instructions that were given in the prompt. Your evaluation will be based on how closely the output adheres to these original instructions, and how well the output addresses the original GitHub issue. 
  Your evaluation should specifically note if the code adheres to the exit criteria (if given), is typed properly (if needed), and ONLY makes the minimal number of changes necessary to address the issue. 
  Even if the changes improve the code (such as removing comments), provide a very low rating if you see ANY unrelated code changes. 
  Provide a brief summary of the evaluation and a final rating of the response from 1 to 5.

  export const EvaluationSchema = z.object({
    evaluation: z.string(), // a detailed, multi-paragraph evaluation based on how closely the output adheres to these original instructions, and how well the output addresses the original GitHub issue.
    unrelatedCodeChanges: z.string(), // a brief list of the unrelated code changes such as removed comments or other unrelated code additions or removals. If there are no unrelated code changes, say "None".
    summary: z.string(), // a brief summary of the evaluation
    rating: z.number().min(1).max(5), // a final rating of the response from 1 to 5 (1 is bad or unrelated code changes, 2 is OK, 3 is good, 4 is great, 5 is perfect)
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
    Review the original user prompt, system prompt, and response. Evaluate how well the response addresses the original user prompt and system prompt. Provide a very low rating if you see unrelated code changes. Provide a detailed, multi-paragraph evaluation based on how closely the output adheres to these original instructions, and how well the output addresses the original GitHub issue. Note any unrelated code changes, provide a brief summary of the evaluation and a final rating of the response from 1 to 5.
    Your response MUST adhere exactly to the EXACT format provided in the EvaluationSchema schema or the system will crash.`;

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
  //   "claude-3-5-sonnet-20240620",
  //   "gpt-4o-2024-05-13",
  //   "gemini-1.5-pro-latest",
  //   "gpt-4-0125-preview",
  // ],
  models: Model[] = [
    "claude-3-5-sonnet-20240620",
    "claude-3-5-sonnet-20240620",
  ],
  minTemperature = 0.2,
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
        userPrompt,
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

    console.log(`
      *** Best Evaluation ***
      Model: ${bestEvaluation.model}
      Temperature: ${bestEvaluation.temperature}
      Average Rating: ${bestEvaluation.evaluations.reduce((sum, e) => sum + (e.rating ?? 0), 0) / bestEvaluation.evaluations.length}
    `);

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
    
    Please update the original response to address the specific issues mentioned in these evaluations. Maintain the overall structure and intent of the original response, but improve it based on the feedback provided. Ensure to address any unrelated code changes mentioned.
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
