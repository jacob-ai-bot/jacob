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
  retries: number,
  models: Model[],
): Promise<number> => {
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

  const evaluationPromises = [];

  // Evaluate using each model, then return the average the scores
  for (const model of models) {
    const evaluationPromise = sendGptRequestWithSchema(
      bestUserPrompt,
      bestSystemPrompt,
      EvaluationSchema,
      0.2,
      baseEventData,
      retries,
      model,
    );
    evaluationPromises.push(evaluationPromise);
  }

  const evaluations = (await Promise.all(
    evaluationPromises,
  )) as EvaluationInfo[];
  return (
    evaluations
      .filter((e) => e.rating && e.rating > 0)
      .reduce((acc, evaluation) => acc + (evaluation.rating ?? 0), 0) /
    evaluations.length
  );
};

export const sendSelfConsistencyChainOfThoughtGptRequest = async (
  userPrompt: string,
  systemPrompt = "You are a helpful assistant.",
  temperature = 0.2,
  baseEventData: BaseEventData | undefined = undefined,
  retries = 5,
  delay = 60000,
  imagePrompt: OpenAI.Chat.ChatCompletionMessageParam | null = null,
  models: Model[] = [
    "gpt-4-0125-preview",
    "gpt-4o-2024-05-13",
    "gemini-1.5-pro-latest",
  ],
  minTemperature = 0.1,
  maxTemperature = 0.3,
  numRequests = 6,
): Promise<string | null> => {
  try {
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
        retries,
        delay,
        imagePrompt,
        models[i % models.length],
      ).then((response) => ({
        response,
        model: models[i % models.length],
        temperature,
      }));
    });

    const initialResults = await Promise.all(initialPromises);

    const evaulationPromises = initialResults.map((result) =>
      evaluate(
        result.response ?? "",
        userPrompt,
        systemPrompt,
        baseEventData,
        retries,
        models,
      ).then((rating) => ({
        response: result.response,
        model: result.model,
        temperature: result.temperature,
        rating,
      })),
    );

    const evaluations = await Promise.all(evaulationPromises);
    const bestEvaluation = evaluations.reduce((best, current) =>
      current.rating > best.rating ? current : best,
    );
    return bestEvaluation.response;
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
        numRequests,
      );
    } else {
      throw error;
    }
  }
};
