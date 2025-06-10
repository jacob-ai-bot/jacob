import { OpenAI } from "openai";
// import { encode } from "gpt-tokenizer";
import type { SafeParseSuccess, ZodSchema } from "zod";
import { parse } from "jsonc-parser";
import { type Message } from "~/types";

import { removeMarkdownCodeblocks } from "~/app/utils";
import { parseTemplate, type BaseEventData } from "../utils";
import { emitPromptEvent } from "../utils/events";
import {
  type ChatCompletionCreateParamsStreaming,
  type ChatCompletionChunk,
  type ChatCompletionTool,
  type ChatCompletionToolChoiceOption,
} from "openai/resources/chat/completions";
import { type Stream } from "openai/streaming";
// import { sendAnthropicRequest } from "../anthropic/request";
import { sendSelfConsistencyChainOfThoughtGptRequest } from "./utils";
import { encode } from "gpt-tokenizer";
import Cerebras from "@cerebras/cerebras_cloud_sdk";
import { PORTKEY_GATEWAY_URL, createHeaders } from "portkey-ai";

const RESPONSE_LENGTH_ERROR = "Response length exceeded max_tokens";

const CONTEXT_WINDOW = {
  "gpt-4-turbo-2024-04-09": 128000,
  "gpt-4-0125-preview": 128000,
  "gpt-4o-2024-05-13": 128000,
  "gpt-4o-mini-2024-07-18": 128000,
  "gpt-4o-64k-output-alpha": 128000,
  "gpt-4o-2024-08-06": 128000,
  "gpt-4o-2024-11-20": 128000,
  "gemini-1.5-pro-latest": 2097152,
  "gemini-1.5-flash-latest": 2097152,
  "gemini-2.5-pro-preview-03-25": 1048576,
  "gemini-2.5-flash-preview-04-17": 1048576,
  "claude-3-opus-20240229": 200000,
  "claude-3-haiku-20240307": 200000,
  "claude-3-5-sonnet-20240620": 200000,
  "claude-3-5-sonnet-20241022": 200000,
  "claude-3-5-haiku-20241022": 200000,
  "claude-3-7-sonnet-20250219": 200000,
  "claude-sonnet-4-20250514": 200000,
  "llama-3.1-sonar-large-128k-online": 127072,
  "llama-3.1-sonar-small-128k-online": 127072,
  "llama3-70b-8192": 8192, // Limited to 8K during preview, will be 128K in the future
  "llama-3-sonar-large-32k-online": 32768,
  "llama-3-sonar-small-32k-online": 32768,
  "llama3.1-8b": 8207,
  "llama3.1-70b": 8207,
  "o1-preview-2024-09-12": 128000,
  "o1-mini-2024-09-12": 128000,
  "o1-2024-12-17": 200000,
  "gpt-4.1": 1047576,
  "gpt-4.1-mini": 1047576,
  "o4-mini": 200000,
  o3: 200000,
  "o3-pro-2025-06-10": 200000,
};

export const MAX_OUTPUT = {
  "gpt-4-turbo-2024-04-09": 4096,
  "gpt-4-0125-preview": 4096,
  "gpt-4o-2024-05-13": 4096,
  "gpt-4o-mini-2024-07-18": 16384,
  "gpt-4o-64k-output-alpha": 64000,
  "gpt-4o-2024-08-06": 16384,
  "gpt-4o-2024-11-20": 16384,
  "gemini-1.5-pro-latest": 8192,
  "gemini-1.5-flash-latest": 8192,
  "gemini-2.5-pro-preview-03-25": 65536,
  "gemini-2.5-flash-preview-04-17": 65536,
  "claude-3-opus-20240229": 4096,
  "claude-3-haiku-20240307": 4096,
  "claude-3-5-sonnet-20240620": 8192,
  "claude-3-5-sonnet-20241022": 8192,
  "claude-3-5-haiku-20241022": 4096,
  "claude-3-7-sonnet-20250219": 64000,
  "claude-sonnet-4-20250514": 64000,
  "llama-3.1-sonar-large-128k-online": 4096,
  "llama-3.1-sonar-small-128k-online": 4096,
  "llama3-70b-8192": 4096,
  "llama-3-sonar-large-32k-online": 4096,
  "llama-3-sonar-small-32k-online": 4096,
  "llama3.1-8b": 4096,
  "llama3.1-70b": 4096,
  "o1-preview-2024-09-12": 16384,
  "o1-mini-2024-09-12": 16384,
  "o1-2024-12-17": 100000,
  "gpt-4.1": 32768,
  "gpt-4.1-mini": 32768,
  "o4-mini": 100000,
  o3: 100000,
  "o3-pro-2025-06-10": 100000,
};

const ONE_MILLION = 1000000;
const INPUT_TOKEN_COSTS = {
  "gpt-4-turbo-2024-04-09": 10 / ONE_MILLION,
  "gpt-4-0125-preview": 10 / ONE_MILLION,
  "gpt-4o-2024-05-13": 5 / ONE_MILLION,
  "gpt-4o-2024-11-20": 5 / ONE_MILLION,
  "gpt-4o-mini-2024-07-18": 0.15 / ONE_MILLION,
  "gpt-4o-64k-output-alpha": 10 / ONE_MILLION,
  "gpt-4o-2024-08-06": 2.5 / ONE_MILLION,
  "gemini-1.5-pro-latest": 3.5 / ONE_MILLION,
  "gemini-1.5-flash-latest": 0.35 / ONE_MILLION,
  "gemini-2.5-pro-preview-03-25": 2 / ONE_MILLION,
  "gemini-2.5-flash-preview-04-17": 0.15 / ONE_MILLION,
  "claude-3-opus-20240229": 15 / ONE_MILLION,
  "claude-3-haiku-20240307": 0.25 / ONE_MILLION,
  "claude-3-5-sonnet-20240620": 3 / ONE_MILLION,
  "claude-3-5-sonnet-20241022": 3 / ONE_MILLION,
  "claude-3-5-haiku-20241022": 1 / ONE_MILLION,
  "claude-3-7-sonnet-20250219": 3 / ONE_MILLION,
  "claude-sonnet-4-20250514": 3 / ONE_MILLION,
  "llama-3.1-sonar-large-128k-online": 1 / ONE_MILLION,
  "llama-3.1-sonar-small-128k-online": 0.2 / ONE_MILLION,
  "llama3-70b-8192": 0.59 / ONE_MILLION,
  "llama-3-sonar-large-32k-online": 1 / ONE_MILLION,
  "llama-3-sonar-small-32k-online": 1 / ONE_MILLION,
  "llama3.1-8b": 0.1 / ONE_MILLION,
  "llama3.1-70b": 0.6 / ONE_MILLION,
  "o1-preview-2024-09-12": 15 / ONE_MILLION,
  "o1-mini-2024-09-12": 3 / ONE_MILLION,
  "o1-2024-12-17": 15 / ONE_MILLION,
  "gpt-4.1": 2 / ONE_MILLION,
  "gpt-4.1-mini": 0.4 / ONE_MILLION,
  "o4-mini": 1.1 / ONE_MILLION,
  o3: 2 / ONE_MILLION,
  "o3-pro-2025-06-10": 20 / ONE_MILLION,
};
const OUTPUT_TOKEN_COSTS = {
  "gpt-4-turbo-2024-04-09": 30 / ONE_MILLION,
  "gpt-4-0125-preview": 30 / ONE_MILLION,
  "gpt-4o-2024-05-13": 30 / ONE_MILLION,
  "gpt-4o-2024-11-20": 30 / ONE_MILLION,
  "gpt-4o-mini-2024-07-18": 0.6 / ONE_MILLION,
  "gpt-4o-64k-output-alpha": 30 / ONE_MILLION,
  "gpt-4o-2024-08-06": 10 / ONE_MILLION,
  "gemini-1.5-pro-latest": 10.5 / ONE_MILLION,
  "gemini-1.5-flash-latest": 1.05 / ONE_MILLION,
  "gemini-2.5-pro-preview-03-25": 12 / ONE_MILLION,
  "gemini-2.5-flash-preview-04-17": 0.6 / ONE_MILLION,
  "claude-3-opus-20240229": 75 / ONE_MILLION,
  "claude-3-haiku-20240307": 1.25 / ONE_MILLION,
  "claude-3-5-sonnet-20240620": 15 / ONE_MILLION,
  "claude-3-5-sonnet-20241022": 15 / ONE_MILLION,
  "claude-3-5-haiku-20241022": 5 / ONE_MILLION,
  "claude-3-7-sonnet-20250219": 15 / ONE_MILLION,
  "claude-sonnet-4-20250514": 15 / ONE_MILLION,
  "llama-3.1-sonar-large-128k-online": 1 / ONE_MILLION,
  "llama-3.1-sonar-small-128k-online": 0.2 / ONE_MILLION,
  "llama3-70b-8192": 0.79 / ONE_MILLION,
  "llama-3-sonar-large-32k-online": 1 / ONE_MILLION,
  "llama-3-sonar-small-32k-online": 1 / ONE_MILLION,
  "llama3.1-8b": 0.1 / ONE_MILLION,
  "llama3.1-70b": 0.6 / ONE_MILLION,
  "o1-preview-2024-09-12": 60 / ONE_MILLION,
  "o1-mini-2024-09-12": 12 / ONE_MILLION,
  "o1-2024-12-17": 60 / ONE_MILLION,
  "gpt-4.1": 8 / ONE_MILLION,
  "gpt-4.1-mini": 1.6 / ONE_MILLION,
  "o4-mini": 4.4 / ONE_MILLION,
  o3: 8 / ONE_MILLION,
  "o3-pro-2025-06-10": 80 / ONE_MILLION,
};
const PORTKEY_VIRTUAL_KEYS = {
  "gpt-4-turbo-2024-04-09": process.env.PORTKEY_VIRTUAL_KEY_OPENAI,
  "gpt-4-0125-preview": process.env.PORTKEY_VIRTUAL_KEY_OPENAI,
  "gpt-4o-2024-05-13": process.env.PORTKEY_VIRTUAL_KEY_OPENAI,
  "gpt-4o-2024-11-20": process.env.PORTKEY_VIRTUAL_KEY_OPENAI,
  "gpt-4o-mini-2024-07-18": process.env.PORTKEY_VIRTUAL_KEY_OPENAI,
  "gpt-4o-64k-output-alpha": process.env.PORTKEY_VIRTUAL_KEY_OPENAI,
  "gpt-4o-2024-08-06": process.env.PORTKEY_VIRTUAL_KEY_OPENAI,
  "gemini-1.5-pro-latest": process.env.PORTKEY_VIRTUAL_KEY_GOOGLE,
  "gemini-1.5-flash-latest": process.env.PORTKEY_VIRTUAL_KEY_GOOGLE,
  "gemini-2.5-pro-preview-03-25": process.env.PORTKEY_VIRTUAL_KEY_GOOGLE,
  "gemini-2.5-flash-preview-04-17": process.env.PORTKEY_VIRTUAL_KEY_GOOGLE,
  "claude-3-opus-20240229": process.env.PORTKEY_VIRTUAL_KEY_ANTHROPIC,
  "claude-3-haiku-20240307": process.env.PORTKEY_VIRTUAL_KEY_ANTHROPIC,
  "claude-3-5-sonnet-20240620": process.env.PORTKEY_VIRTUAL_KEY_ANTHROPIC,
  "claude-3-5-sonnet-20241022": process.env.PORTKEY_VIRTUAL_KEY_ANTHROPIC,
  "claude-3-5-haiku-20241022": process.env.PORTKEY_VIRTUAL_KEY_ANTHROPIC,
  "claude-3-7-sonnet-20250219": process.env.PORTKEY_VIRTUAL_KEY_ANTHROPIC,
  "claude-sonnet-4-20250514": process.env.PORTKEY_VIRTUAL_KEY_ANTHROPIC,
  "llama-3.1-sonar-large-128k-online":
    process.env.PORTKEY_VIRTUAL_KEY_PERPLEXITY,
  "llama-3.1-sonar-small-128k-online":
    process.env.PORTKEY_VIRTUAL_KEY_PERPLEXITY,
  "llama3-70b-8192": process.env.PORTKEY_VIRTUAL_KEY_GROQ,
  "llama-3-sonar-large-32k-online": process.env.PORTKEY_VIRTUAL_KEY_PERPLEXITY,
  "llama-3-sonar-small-32k-online": process.env.PORTKEY_VIRTUAL_KEY_PERPLEXITY,
  "llama3.1-8b": process.env.PORTKEY_VIRTUAL_KEY_CEREBRAS,
  "llama3.1-70b": process.env.PORTKEY_VIRTUAL_KEY_CEREBRAS,
  "o1-preview-2024-09-12": process.env.PORTKEY_VIRTUAL_KEY_OPENAI,
  "o1-mini-2024-09-12": process.env.PORTKEY_VIRTUAL_KEY_OPENAI,
  "o1-2024-12-17": process.env.PORTKEY_VIRTUAL_KEY_OPENAI,
  "gpt-4.1": process.env.PORTKEY_VIRTUAL_KEY_OPENAI,
  "gpt-4.1-mini": process.env.PORTKEY_VIRTUAL_KEY_OPENAI,
  "o4-mini": process.env.PORTKEY_VIRTUAL_KEY_OPENAI,
  o3: process.env.PORTKEY_VIRTUAL_KEY_OPENAI,
  "o3-pro-2025-06-10": process.env.PORTKEY_VIRTUAL_KEY_OPENAI,
};

export type Model = keyof typeof CONTEXT_WINDOW;

export function countTokens(text: string): number {
  return encode(text).length;
}

export function isTextTooLongForContextWindow(
  text: string,
  model: Model,
  buffer = 0.95,
): boolean {
  const totalTokens = countTokens(text);
  return totalTokens > buffer * CONTEXT_WINDOW[model];
}

const cerebrasClient = new Cerebras({
  apiKey: process.env.CEREBRAS_API_KEY ?? "",
});

// Function to check if the prompt fits within the model's context window
export function isPromptWithinContextWindow(
  userPrompt: string,
  systemPrompt: string,
  model: Model,
): boolean {
  const totalTokens = countTokens(userPrompt) + countTokens(systemPrompt);
  return totalTokens <= 0.95 * CONTEXT_WINDOW[model]; // give a 5% buffer to account for variations in tokenization between models
}

const sendOpenAIRequest = async (
  userPrompt: string,
  systemPrompt: string,
  temperature: number,
  baseEventData: BaseEventData | undefined,
  retries: number,
  delay: number,
  imagePrompt: OpenAI.Chat.ChatCompletionMessageParam | null,
  model: Model,
  isJSONMode: boolean,
  reasoningEffort: OpenAI.Chat.ChatCompletionReasoningEffort,
): Promise<string | null> => {
  try {
    const isReasoningModel =
      model === "o1-mini-2024-09-12" ||
      model === "o1-preview-2024-09-12" ||
      model === "o1-2024-12-17" ||
      model === "o3" ||
      model === "o3-pro-2025-06-10" ||
      model === "o4-mini";
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? "",
    });

    const messages = [
      {
        role: isReasoningModel ? "developer" : "system",
        content: systemPrompt,
      },
      { role: "user", content: userPrompt },
    ] as OpenAI.Chat.ChatCompletionMessageParam[];

    if (imagePrompt) {
      messages.unshift(imagePrompt);
    }

    // Calculate input tokens
    const inputTokens = messages.reduce((acc, msg) => {
      return (
        acc +
        countTokens(
          typeof msg.content === "string"
            ? msg.content
            : JSON.stringify(msg.content),
        )
      );
    }, 0);

    // Calculate available tokens for completion with 5% buffer
    const maxCompletionTokens = Math.floor(
      (CONTEXT_WINDOW[model] - inputTokens) * 0.95,
    );
    const finalMaxTokens = Math.min(maxCompletionTokens, MAX_OUTPUT[model]);

    if (maxCompletionTokens <= 0) {
      throw new Error(
        `Input tokens (${inputTokens}) exceed model's context window (${CONTEXT_WINDOW[model]})`,
      );
    }

    const startTime = Date.now();
    console.log(
      `\n +++ Calling ${model} with max_tokens: ${finalMaxTokens} (input tokens: ${inputTokens})`,
    );

    const options = {
      model,
      messages,
      ...(isReasoningModel ? {} : { temperature }),
      ...(isReasoningModel
        ? { max_completion_tokens: finalMaxTokens }
        : { max_tokens: finalMaxTokens }),
      response_format: isJSONMode ? { type: "json_object" } : undefined,
      ...(isReasoningModel
        ? { reasoning_effort: reasoningEffort ?? "high" }
        : {}),
    } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming;
    console.log("options", options);
    const response = await openai.chat.completions.create(options);
    const endTime = Date.now();
    const duration = endTime - startTime;

    const inTokens = response.usage?.prompt_tokens ?? 0;
    const outputTokens = response.usage?.completion_tokens ?? 0;
    const tokens = inTokens + outputTokens;
    const cost =
      inTokens * INPUT_TOKEN_COSTS[model] +
      outputTokens * OUTPUT_TOKEN_COSTS[model];

    if (baseEventData) {
      await emitPromptEvent({
        ...baseEventData,
        cost,
        tokens,
        duration,
        model,
        requestPrompts: messages.map((message) => ({
          promptType: (message.role?.toUpperCase() ?? "User") as
            | "User"
            | "System"
            | "Assistant"
            | "Developer",
          prompt:
            typeof message.content === "string"
              ? message.content
              : JSON.stringify(message.content),
        })),
        responsePrompt: response.choices[0]?.message.content ?? "",
      });
    }
    const content = response.choices[0]?.message.content ?? null;
    console.log("Response content: ", content);
    return content;
  } catch (error) {
    if (retries === 0) {
      console.error("Error in OpenAI request:", error);
      throw error;
    }
    console.log(
      `Error in OpenAI request, retrying in ${delay}ms. Retries remaining: ${retries}`,
    );
    await new Promise((resolve) => setTimeout(resolve, delay));
    return sendOpenAIRequest(
      userPrompt,
      systemPrompt,
      temperature,
      baseEventData,
      retries - 1,
      delay * 2,
      imagePrompt,
      model,
      isJSONMode,
      reasoningEffort,
    );
  }
};

export const sendGptRequest = async (
  userPrompt: string,
  systemPrompt = "You are a helpful assistant.",
  temperature = 0.2,
  baseEventData: BaseEventData | undefined = undefined,
  retries = 10,
  delay = 60000, // rate limit is 40K tokens per minute, so by default start with 60 seconds
  imagePrompt: OpenAI.Chat.ChatCompletionMessageParam | null = null,
  model: Model = "claude-3-7-sonnet-20250219",
  isJSONMode = false,
  reasoningEffort: OpenAI.Chat.ChatCompletionReasoningEffort = "high",
): Promise<string | null> => {
  // console.log("\n\n --- User Prompt --- \n\n", userPrompt);
  // console.log("\n\n --- System Prompt --- \n\n", systemPrompt);

  try {
    const isReasoningModel =
      model === "o1-mini-2024-09-12" ||
      model === "o1-preview-2024-09-12" ||
      model === "o1-2024-12-17" ||
      model === "o3" ||
      model === "o3-pro-2025-06-10" ||
      model === "o4-mini";
    // Check if the prompt fits within the context window
    if (!isPromptWithinContextWindow(userPrompt, systemPrompt, model)) {
      // If it doesn't fit, try with the largest model
      const largestModel: Model = "gemini-1.5-pro-latest";
      if (isPromptWithinContextWindow(userPrompt, systemPrompt, largestModel)) {
        console.log(
          `Prompt too large for ${model}. Switching to ${largestModel}.`,
        );
        model = largestModel;
      } else {
        throw new Error("Prompt is too large for all available models.");
      }
    }

    // For now, if we get a request to use o1-2024-12-17, we will call the OpenAI API directly.
    if (isReasoningModel) {
      return sendOpenAIRequest(
        userPrompt,
        systemPrompt,
        temperature,
        baseEventData,
        retries,
        delay,
        imagePrompt,
        model,
        isJSONMode,
        reasoningEffort,
      );
    }

    // For now, if we get a request to use Sonnet 3.5 or Haiku 3.5, we will call the anthropic SDK directly. This is because the portkey gateway does not support several features for the claude model yet.
    // if (
    //   (model === "claude-3-5-sonnet-20241022" ||
    //     model === "claude-3-5-haiku-20241022") &&
    //   !isJSONMode
    // ) {
    //   return sendAnthropicRequest(
    //     userPrompt,
    //     systemPrompt,
    //     temperature,
    //     baseEventData,
    //     retries,
    //     delay,
    //   );
    // }

    let openai: OpenAI;
    if (model?.startsWith("llama3.1")) {
      // This is a Cerebras API call
      openai = new OpenAI({
        apiKey: process.env.CEREBRAS_API_KEY,
        baseURL: "https://api.cerebras.ai/v1",
      });
    } else {
      openai = new OpenAI({
        apiKey: "using-virtual-portkey-key",
        baseURL: PORTKEY_GATEWAY_URL,
        defaultHeaders: createHeaders({
          apiKey: process.env.PORTKEY_API_KEY ?? "",
          virtualKey: PORTKEY_VIRTUAL_KEYS[model],
          config: {
            cache: { mode: "simple" },
            retry: { attempts: 3 },
          },
        }),
      });
    }

    const max_tokens = MAX_OUTPUT[model];

    const systemMessage =
      isJSONMode && !systemPrompt.includes("JSON")
        ? `${systemPrompt}\n You must only respond in JSON with no other text. If you do not respond ONLY in JSON, the user will be unable to parse your response.`
        : systemPrompt;

    const messages = [
      { role: "system", content: systemMessage },
      { role: "user", content: userPrompt },
    ] as OpenAI.Chat.ChatCompletionMessageParam[];

    if (imagePrompt) {
      messages.unshift(imagePrompt);
    }

    // Temp fix, portkey doesn't currently support json mode for claude
    const needsJsonHelper = isJSONMode && model.includes("claude");
    if (needsJsonHelper) {
      messages.push({
        role: "assistant",
        content:
          "Here is the requested JSON that adheres perfectly to the schema noted above:\n```json\n{",
      });
    }

    console.log(`\n +++ Calling ${model} with max_tokens: ${max_tokens} `);
    const startTime = Date.now();
    let options = {
      model,
      messages,
      max_tokens,
      temperature,
      response_format: isJSONMode ? { type: "json_object" } : undefined,
    } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming;

    // since o1-mini and o1-preview don't support system prompts, we need to add the system prompt to the user message and remove the system message
    if (isReasoningModel) {
      options = {
        messages: [
          { role: "user", content: `${systemPrompt}\n\n${userPrompt}` },
        ],
        model,
      };
    }
    let response;
    if (model?.startsWith("llama3.1")) {
      response = await cerebrasClient.chat.completions.create({
        messages: options.messages.map((message) => ({
          role: message.role as "system" | "user" | "assistant",
          content: message.content,
        })) as { role: "system" | "user" | "assistant"; content: string }[],
        model: options.model,
        max_tokens: options.max_tokens,
        temperature: options.temperature,
      });
    } else {
      response = await openai.chat.completions.create(options);
    }
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`\n +++ ${model} Response time ${duration} ms`);

    const gptResponse = response.choices[0]?.message;

    if (
      response.choices[0]?.finish_reason === "length" ||
      // @ts-expect-error - this is a type bug in the Portkey SDK
      response.choices[0]?.finish_reason === "max_tokens"
    ) {
      console.log(
        `\n\n +++ ERROR: ${model} Response finish reason: ${response.choices[0]?.finish_reason}`,
      );
      throw new Error(RESPONSE_LENGTH_ERROR);
    }
    // console.log("\n\n --- GPT Response --- \n\n", gptResponse);
    let content = gptResponse?.content ?? "";
    if (needsJsonHelper) {
      content = `{${content}`; // add the starting bracket back to the JSON response
    }

    const inputTokens = response.usage?.prompt_tokens ?? 0;
    const outputTokens = response.usage?.completion_tokens ?? 0;
    const tokens = inputTokens + outputTokens;
    const cost =
      inputTokens * INPUT_TOKEN_COSTS[model] +
      outputTokens * OUTPUT_TOKEN_COSTS[model];
    if (baseEventData) {
      // send an internal event to track the prompts, timestamp, cost, tokens, and other data
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await emitPromptEvent({
        ...baseEventData,
        cost,
        tokens,
        duration,
        model,
        requestPrompts: messages.map((message) => ({
          promptType: (message.role?.toUpperCase() ?? "User") as
            | "User"
            | "System"
            | "Assistant",
          prompt:
            typeof message.content === "string"
              ? message.content
              : JSON.stringify(message.content),
        })),
        responsePrompt: content,
      });
    }

    // console.log("GPT Response: ", content);
    return content;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes(RESPONSE_LENGTH_ERROR) &&
      retries > 0
    ) {
      // update the model to a larger one
      model = "gpt-4o-2024-08-06";
      return sendGptRequest(
        userPrompt,
        systemPrompt,
        temperature,
        baseEventData,
        0,
        delay,
        imagePrompt,
        model,
        isJSONMode,
      );
    }
    if (
      retries === 0 ||
      (error as { response?: Response })?.response?.status !== 429
    ) {
      console.error(`Error in GPT request: ${String(error)}`);
      throw error;
    } else {
      console.log(
        `Received 429, retries remaining: ${retries}. Retrying in ${delay} ms...`,
      );
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          sendGptRequest(
            userPrompt,
            systemPrompt,
            temperature,
            baseEventData,
            retries - 1,
            delay * 2,
            imagePrompt,
            model,
            isJSONMode,
          )
            .then(resolve)
            .catch(reject);
        }, delay);
      });
    }
  }
};

// Return type should be a ZodSchema or an array of ZodSchema objects
export const sendGptRequestWithSchema = async (
  userPrompt: string,
  systemPrompt: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  zodSchema: ZodSchema<any>,
  temperature = 0.2,
  baseEventData: BaseEventData | undefined = undefined,
  retries = 3,
  model: Model = "claude-3-5-sonnet-20241022",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> => {
  let extractedInfo;
  let retryCount = 0; // Initialize a retry counter

  // Loop until a valid response is received or the maxRetries limit is reached
  while (retryCount < retries) {
    let gptResponse: string | null = null;
    // if retries is greater than 0, slightly modify the system prompt to avoid hitting the same issue via cache
    if (retryCount > 0) {
      systemPrompt = `Attempt #${retryCount + 1} - ${systemPrompt}`;
    }

    try {
      gptResponse = await sendGptRequest(
        userPrompt,
        systemPrompt,
        temperature, // Use a lower temperature for retries
        baseEventData,
        0,
        60000,
        null,
        model,
        true,
      );

      if (!gptResponse) {
        throw new Error("/n/n/n/n **** Empty response from GPT **** /n/n/n/n");
      }
      // console.log("GPT Response: ", gptResponse);
      // Remove any code blocks from the response prior to attempting to parse it
      gptResponse = removeMarkdownCodeblocks(gptResponse);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      extractedInfo = parse(gptResponse);
      // console.log("Extracted Info: ", extractedInfo);
      // if the response is an array of objects, validate each object individually and return the full array if successful
      if (Array.isArray(extractedInfo)) {
        const validatedInfo = extractedInfo.map(
          (info) => zodSchema.safeParse(info), // as SafeParseReturnType<any, any>,
        );
        // console.log("validatedInfo: ", validatedInfo);
        const failedValidations = validatedInfo.filter(
          (result) => result.success === false,
        );

        if (failedValidations.length > 0) {
          console.log("Failed Validations: ", failedValidations);
          console.log("gptResponse: ", gptResponse);
          console.log("Extracted Info: ", extractedInfo);
          throw new Error(
            `Invalid response from GPT - object is not able to be parsed using the provided schema: ${JSON.stringify(
              failedValidations,
            )}`,
          );
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
        return (validatedInfo as SafeParseSuccess<any>[]).map(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          (result) => result.data,
        );
      }

      // if the response is a single object, validate it and return it if successful
      const validationResult = zodSchema.safeParse(
        extractedInfo,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      );

      if (validationResult.success) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return validationResult.data;
      }

      throw new Error(
        `Invalid response from GPT - object is not able to be parsed using the provided schema: ${JSON.stringify(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          validationResult.error,
        )}`,
      );
    } catch (error) {
      console.log(
        `Error occurred during GPT request: ${
          (error as { message?: string })?.message?.substring(0, 200) ?? ""
        }`,
      );
      retryCount++;
    }
  }

  throw new Error(
    `Max retries exceeded for GPT request: ${userPrompt.substring(0, 200)}`,
  );
};

export const sendGptVisionRequest = async (
  userPrompt: string,
  systemPrompt = "You are a helpful assistant.",
  snapshotUrl = "",
  temperature = 0.2,
  baseEventData: BaseEventData | undefined = undefined,
  retries = 3,
  delay = 60000,
): Promise<string | null> => {
  const model: Model = "gpt-4o-2024-08-06";

  if (!snapshotUrl?.length) {
    // TODO: change this to sendSelfConsistencyChainOfThoughtGptRequest(
    return sendSelfConsistencyChainOfThoughtGptRequest(
      userPrompt,
      systemPrompt,
      temperature,
      baseEventData,
      retries,
      delay,
      null,
    );
  }
  let imagePrompt = null;
  if (snapshotUrl?.length > 0) {
    const prompt = parseTemplate("dev", "vision", "user", {});

    // download the image data if needed
    // const url = await fetchImageAsBase64(snapshotUrl);
    // if (!url) {
    //   throw new Error("Failed to download image data");
    // }

    imagePrompt = {
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: {
            url: snapshotUrl,
            detail: "high",
          },
        },
        {
          type: "text",
          text: prompt,
        },
      ],
    } as OpenAI.Chat.ChatCompletionMessageParam;
  }

  return sendGptRequest(
    userPrompt,
    systemPrompt,
    temperature,
    baseEventData,
    retries,
    delay,
    imagePrompt,
    model,
  );
};

export const OpenAIStream = async (
  model: Model = "gpt-4o-2024-08-06",
  messages: Message[],
  systemPrompt = "You are a helpful friendly assistant.",
  temperature = 1,
): Promise<Stream<ChatCompletionChunk>> => {
  try {
    const openai = new OpenAI({
      apiKey: "using-virtual-portkey-key",
      baseURL: PORTKEY_GATEWAY_URL,
      defaultHeaders: createHeaders({
        apiKey: process.env.PORTKEY_API_KEY ?? "",
        virtualKey: PORTKEY_VIRTUAL_KEYS[model],
        config: {
          cache: { mode: "simple" },
          retry: { attempts: 3 },
        },
      }),
    });

    const max_tokens = MAX_OUTPUT[model];

    console.log(`\n +++ Calling ${model} with max_tokens: ${max_tokens} `);

    const chatCompletionParams: ChatCompletionCreateParamsStreaming = {
      model: model,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        ...messages.map((msg) => ({ role: msg.role, content: msg.content })),
      ],
      temperature,
      max_tokens,
      stream: true,
    };

    // Start the streaming session with OpenAI
    return openai.chat.completions.create(chatCompletionParams);
  } catch (error) {
    console.error("Error creating chat completion:", error);
    throw error;
  }
};

export const sendGptToolRequest = async (
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  tools: ChatCompletionTool[],
  temperature = 0.3,
  baseEventData: BaseEventData | undefined = undefined,
  retries = 3,
  delay = 60000,
  model: Model = "gpt-4-turbo-2024-04-09",
  toolChoice: ChatCompletionToolChoiceOption = "auto",
  parallelToolCalls = false,
): Promise<OpenAI.Chat.ChatCompletion> => {
  const openai = new OpenAI({
    apiKey: "using-virtual-portkey-key",
    baseURL: PORTKEY_GATEWAY_URL,
    defaultHeaders: createHeaders({
      apiKey: process.env.PORTKEY_API_KEY ?? "",
      virtualKey: PORTKEY_VIRTUAL_KEYS[model],
      config: {
        cache: { mode: "simple" },
        retry: { attempts: 3 },
      },
    }),
  });

  try {
    const max_tokens = MAX_OUTPUT[model];

    console.log(
      `\n +++ Calling ${model} with max_tokens: ${max_tokens} for tool request`,
    );
    const startTime = Date.now();

    const response = await openai.chat.completions.create({
      model,
      messages,
      max_tokens,
      temperature,
      tools,
      tool_choice: toolChoice,
      ...(parallelToolCalls ? { parallel_tool_calls: true } : {}),
    });

    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(
      `\n +++ ${model} Response time ${duration} ms for tool request`,
    );

    const inputTokens = response.usage?.prompt_tokens ?? 0;
    const outputTokens = response.usage?.completion_tokens ?? 0;
    const tokens = inputTokens + outputTokens;
    const cost =
      inputTokens * INPUT_TOKEN_COSTS[model] +
      outputTokens * OUTPUT_TOKEN_COSTS[model];

    if (baseEventData) {
      await emitPromptEvent({
        ...baseEventData,
        cost,
        tokens,
        duration,
        model,
        requestPrompts: messages.map((message) => ({
          promptType: (message.role?.toUpperCase() ?? "User") as
            | "User"
            | "System"
            | "Assistant",
          prompt:
            typeof message.content === "string"
              ? message.content
              : JSON.stringify(message.content),
        })),
        responsePrompt: JSON.stringify(response.choices[0]?.message),
      });
    }

    return response;
  } catch (error) {
    if (
      retries === 0 ||
      !(error instanceof Error) ||
      (error as { response?: Response })?.response?.status !== 429
    ) {
      console.error(
        `Error in GPT tool request: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    } else {
      console.log(
        `Received 429, retries remaining: ${retries}. Retrying in ${delay} ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return sendGptToolRequest(
        messages,
        tools,
        temperature,
        baseEventData,
        retries - 1,
        delay * 2,
        model,
        toolChoice,
        parallelToolCalls,
      );
    }
  }
};
