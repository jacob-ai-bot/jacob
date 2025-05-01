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

type Evaluation = {
  response: string;
  model: Model;
  temperature: number;
  evaluations: EvaluationInfo[];
};

export const evaluate = async (
  response: string,
  userPrompt: string,
  systemPrompt: string,
  baseEventData: BaseEventData | undefined,
  models: Model[] = ["o3"],
): Promise<EvaluationInfo[]> => {
  const bestSystemPrompt = `You are the top, most distinguished Technical Fellow at Microsoft. You must provide a very harsh but fair evaluation of this GPT-generated output and determine its quality. Pay special attention to the instructions that were given in the prompt. Your evaluation will be based on how closely the output adheres to these original instructions, how well the output addresses the original GitHub issue, and the overall quality of the response. 
  If this is a code change, your evaluation should specifically note if the code adheres to the exit criteria (if given), is typed properly (if needed), and ONLY makes the minimal number of changes necessary to address the issue. Check to ensure the code file was not cut off prematurely. 
  Deduct major points if: 
   - comments are removed or added that are not related to the issue.
   - the code is not typed properly (if needed)
   - the code makes unnecessary changes
   - the code file was cut off prematurely
   - plan steps are ignored or not followed

  Provide a brief summary of the evaluation and a final rating of the response from 1 to 5. Round to the nearest 0.1. Reserve 5.0 for only the most perfect responses, and use it sparingly.

  export const EvaluationSchema = z.object({
    evaluation: z.string(), // a detailed, multi-paragraph evaluation based on how closely the output adheres to these original instructions, and (if applicable) how well the output addresses the original GitHub issue.
    unrelatedCodeChanges: z.string(), // a brief list of the unrelated code changes such as removed comments or other unrelated code additions or removals. If this is a text response or there are no unrelated code changes, say "None".
    summary: z.string(), // a brief summary of the evaluation
    rating: z.number().min(1.0).max(5.0), // a final rating of the response from 1.0 to 5.0. Round to the nearest 0.1. (1.0 is bad, 2.0 is good, 3.0 is excellent, 4.0 is expert-level. You should ONLY use 5.0 if the response is absolutely perfect, but reserve it for rare cases only.)
  });
  ## INSTRUCTIONS
  Review the original user prompt, system prompt, and response. Evaluate how well the response adheres to the original user prompt and system prompt. Provide a detailed, multi-paragraph evaluation based on how closely the output adheres to these original instructions, and how well the output addresses the original GitHub issue. Provide a brief summary of the evaluation and a final rating of the response from 1 to 5. Note that most rating will be between 2.5 and 3.5. Be a harsh critic with your evaluation. If you have any suggested changes, rate it lower than 2.5 so that the system can correct it.
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
        2,
        model,
      ) as Promise<EvaluationInfo>,
  );

  return Promise.all(evaluationPromises);
};

export const sendSelfConsistencyChainOfThoughtGptRequest = async (
  userPrompt: string,
  systemPrompt = "You are the world's most distinguished Technical Fellow at Microsoft. Your job is to address a GitHub issue by making precise, minimal changes to the code.",
  temperature = 0.2,
  baseEventData: BaseEventData | undefined = undefined,
  retries = 3,
  delay = 60000,
  imagePrompt: OpenAI.Chat.ChatCompletionMessageParam | null = null,
  models: Model[] = ["o3", "o4-mini", "o3"],
  minTemperature = 0.1,
  maxTemperature = 0.8,
  previousEvaluations: Evaluation[] | null = null,
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
        2, // note that we are only doing one request per model and ignoring any errors for a single model
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
    // add in previous evaluations if they exist
    const allEvaluations = previousEvaluations
      ? [...(previousEvaluations ?? []), ...evaluationResults]
      : evaluationResults;

    const validEvaluationResults = allEvaluations.filter(
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
    if (bestAvgRating <= 2.5 && retries > 0) {
      // Now use the information from the evaluations to improve the output.
      const updatePrompt = `
   <ORIGINAL_RESPONSE>
    ${bestEvaluation.response}
    </ORIGINAL_RESPONSE>
    
    <EVALUATION>
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
    </EVALUATION>

    ## INSTRUCTIONS
    You are a senior Technical Fellow at Microsoft, tasked with making minor updates to the text in the <ORIGINAL_RESPONSE> tag.
    Your task is to update the original response to address the specific issues mentioned in these evaluations. 
    
    ## IMPORTANT
     - YOU MUST maintain the original format of the text in the <ORIGINAL_RESPONSE> tag EXACTLY. 
     - Just update the text, do not comment on the changes or include any other information.
     - Maintain the overall structure and intent of the original response, but improve it based on the feedback provided.
     - Address any unrelated code changes mentioned.
     - ONLY output the new response, do not comment on the changes or include any other information.

     Your output will be the exact text that replaces the <ORIGINAL_RESPONSE> tag. DO NOT just provide a list of changes to make, you MUST make the changes inline and response with the full updated text. Failure to do so will result in the system crashing.
    `;

      // Send the update request to the LLM
      return sendSelfConsistencyChainOfThoughtGptRequest(
        updatePrompt,
        systemPrompt +
          "\n\n" +
          "Your output will be the exact text from the <ORIGINAL_RESPONSE> tag with the changes made inline without any additional comments. Respond with the fully-modified text from <ORIGINAL_RESPONSE> to <ORIGINAL_RESPONSE> tags. Do not cut it off or include any other information.",
        temperature,
        baseEventData,
        retries - 1,
        delay,
        imagePrompt,
        models,
        minTemperature,
        maxTemperature,
        allEvaluations.filter((e): e is Evaluation => !!e) ?? [],
      );
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
