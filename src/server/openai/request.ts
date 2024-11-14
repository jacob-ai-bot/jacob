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
import { sendAnthropicRequest } from "../anthropic/request";
import { sendSelfConsistencyChainOfThoughtGptRequest } from "./utils";
import { encode } from "gpt-tokenizer";
import Cerebras from "@cerebras/cerebras_cloud_sdk";

const PORTKEY_GATEWAY_URL = "https://api.portkey.ai/v1";

const CONTEXT_WINDOW = {
  "gpt-4-turbo-2024-04-09": 128000,
  "gpt-4-0125-preview": 128000,
  "gpt-4o-2024-05-13": 128000,
  "gpt-4o-mini-2024-07-18": 128000,
  "gpt-4o-64k-output-alpha": 128000,
  "gpt-4o-2024-08-06": 128000,
  "gemini-1.5-pro-latest": 2097152,
  "gemini-1.5-flash-latest": 2097152,
  "claude-3-opus-20240229": 200000,
  "claude-3-haiku-20240307": 200000,
  "claude-3-5-sonnet-20240620": 200000,
  "claude-3-5-sonnet-20241022": 200000,
  "claude-3-5-haiku-20241022": 200000,
  "llama-3.1-sonar-large-128k-online": 127072,
  "llama-3.1-sonar-small-128k-online": 127072,
  "llama3-70b-8192": 8192, // Limited to 8K during preview, will be 128K in the future
  "llama-3-sonar-large-32k-online": 32768,
  "llama-3-sonar-small-32k-online": 32768,
  "llama3.1-8b": 8207,
  "llama3.1-70b": 8207,
  "o1-preview-2024-09-12": 128000,
  "o1-mini-2024-09-12": 128000,
};

export const MAX_OUTPUT = {
  "gpt-4-turbo-2024-04-09": 4096,
  "gpt-4-0125-preview": 4096,
  "gpt-4o-2024-05-13": 4096,
  "gpt-4o-mini-2024-07-18": 16384,
  "gpt-4o-64k-output-alpha": 64000,
  "gpt-4o-2024-08-06": 16384,
  "gemini-1.5-pro-latest": 8192,
  "gemini-1.5-flash-latest": 8192,
  "claude-3-opus-20240229": 4096,
  "claude-3-haiku-20240307": 4096,
  "claude-3-5-sonnet-20240620": 8192,
  "claude-3-5-sonnet-20241022": 8192,
  "claude-3-5-haiku-20241022": 4096,
  "llama-3.1-sonar-large-128k-online": 4096,
  "llama-3.1-sonar-small-128k-online": 4096,
  "llama3-70b-8192": 4096,
  "llama-3-sonar-large-32k-online": 4096,
  "llama-3-sonar-small-32k-online": 4096,
  "llama3.1-8b": 4096,
  "llama3.1-70b": 4096,
  "o1-preview-2024-09-12": 16384,
  "o1-mini-2024-09-12": 16384,
};

const ONE_MILLION = 1000000;
const INPUT_TOKEN_COSTS = {
  "gpt-4-turbo-2024-04-09": 10 / ONE_MILLION,
  "gpt-4-0125-preview": 10 / ONE_MILLION,
  "gpt-4o-2024-05-13": 5 / ONE_MILLION,
  "gpt-4o-mini-2024-07-18": 0.15 / ONE_MILLION,
  "gpt-4o-64k-output-alpha": 10 / ONE_MILLION,
  "gpt-4o-2024-08-06": 2.5 / ONE_MILLION,
  "gemini-1.5-pro-latest": 3.5 / ONE_MILLION,
  "gemini-1.5-flash-latest": 0.35 / ONE_MILLION,
  "claude-3-opus-20240229": 15 / ONE_MILLION,
  "claude-3-haiku-20240307": 0.25 / ONE_MILLION,
  "claude-3-5-sonnet-20240620": 3 / ONE_MILLION,
  "claude-3-5-sonnet-20241022": 3 / ONE_MILLION,
  "claude-3-5-haiku-20241022": 1 / ONE_MILLION,
  "llama-3.1-sonar-large-128k-online": 1 / ONE_MILLION,
  "llama-3.1-sonar-small-128k-online": 0.2 / ONE_MILLION,
  "llama3-70b-8192": 0.59 / ONE_MILLION,
  "llama-3-sonar-large-32k-online": 1 / ONE_MILLION,
  "llama-3-sonar-small-32k-online": 1 / ONE_MILLION,
  "llama3.1-8b": 0.1 / ONE_MILLION,
  "llama3.1-70b": 0.6 / ONE_MILLION,
  "o1-preview-2024-09-12": 15 / ONE_MILLION,
  "o1-mini-2024-09-12": 3 / ONE_MILLION,
};
const OUTPUT_TOKEN_COSTS = {
  "gpt-4-turbo-2024-04-09": 30 / ONE_MILLION,
  "gpt-4-0125-preview": 30 / ONE_MILLION,
  "gpt-4o-2024-05-13": 30 / ONE_MILLION,
  "gpt-4o-mini-2024-07-18": 0.6 / ONE_MILLION,
  "gpt-4o-64k-output-alpha": 30 / ONE_MILLION,
  "gpt-4o-2024-08-06": 10 / ONE_MILLION,
  "gemini-1.5-pro-latest": 10.5 / ONE_MILLION,
  "gemini-1.5-flash-latest": 1.05 / ONE_MILLION,
  "claude-3-opus-20240229": 75 / ONE_MILLION,
  "claude-3-haiku-20240307": 1.25 / ONE_MILLION,
  "claude-3-5-sonnet-20240620": 15 / ONE_MILLION,
  "claude-3-5-sonnet-20241022": 15 / ONE_MILLION,
  "claude-3-5-haiku-20241022": 5 / ONE_MILLION,
  "llama-3.1-sonar-large-128k-online": 1 / ONE_MILLION,
  "llama-3.1-sonar-small-128k-online": 0.2 / ONE_MILLION,
  "llama3-70b-8192": 0.79 / ONE_MILLION,
  "llama-3-sonar-large-32k-online": 1 / ONE_MILLION,
  "llama-3-sonar-small-32k-online": 1 / ONE_MILLION,
  "llama3.1-8b": 0.1 / ONE_MILLION,
  "llama3.1-70b": 0.6 / ONE_MILLION,
  "o1-preview-2024-09-12": 60 / ONE_MILLION,
  "o1-mini-2024-09-12": 12 / ONE_MILLION,
};
const PORTKEY_VIRTUAL_KEYS = {
  "gpt-4-turbo-2024-04-09": process.env.PORTKEY_VIRTUAL_KEY_OPENAI,
  "gpt-4-0125-preview": process.env.PORTKEY_VIRTUAL_KEY_OPENAI,
  "gpt-4o-2024-05-13": process.env.PORTKEY_VIRTUAL_KEY_OPENAI,
  "gpt-4o-mini-2024-07-18": process.env.PORTKEY_VIRTUAL_KEY_OPENAI,
  "gpt-4o-64k-output-alpha": process.env.PORTKEY_VIRTUAL_KEY_OPENAI,
  "gpt-4o-2024-08-06": process.env.PORTKEY_VIRTUAL_KEY_OPENAI,
  "gemini-1.5-pro-latest": process.env.PORTKEY_VIRTUAL_KEY_GOOGLE,
  "gemini-1.5-flash-latest": process.env.PORTKEY_VIRTUAL_KEY_GOOGLE,
  "claude-3-opus-20240229": process.env.PORTKEY_VIRTUAL_KEY_ANTHROPIC,
  "claude-3-haiku-20240307": process.env.PORTKEY_VIRTUAL_KEY_ANTHROPIC,
  "claude-3-5-sonnet-20240620": process.env.PORTKEY_VIRTUAL_KEY_ANTHROPIC,
  "claude-3-5-sonnet-20241022": process.env.PORTKEY_VIRTUAL_KEY_ANTHROPIC,
  "claude-3-5-haiku-20241022": process.env.PORTKEY_VIRTUAL_KEY_ANTHROPIC,
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
};

export type Model = keyof typeof CONTEXT_WINDOW;

export function countTokens(text: string): number {
  return encode(text).length;
}

const cerebrasClient = new Cerebras({
  apiKey: process.env.CEREBRAS_API_KEY ?? "",
});

export function isPromptWithinContextWindow(
  userPrompt: string,
  systemPrompt: string,
  model: Model,
): boolean {
  const totalTokens = countTokens(userPrompt) + countTokens(systemPrompt);
  return totalTokens <= 0.95 * CONTEXT_WINDOW[model];
}

export function getModelTokenLimit(modelName: string): number {
  return CONTEXT_WINDOW[modelName as Model] || 200000;
}

export const sendGptRequest = async (
  userPrompt: string,
  systemPrompt = "You are a helpful assistant.",
  temperature = 0.2,
  baseEventData: BaseEventData | undefined = undefined,
  retries = 10,
  delay = 60000,
  imagePrompt: OpenAI.Chat.ChatCompletionMessageParam | null = null,
  model: Model = "claude-3-5-sonnet-20241022",
  isJSONMode = false,
): Promise<string | null> => {
  console.log("\n\n --- User Prompt --- \n\n", userPrompt);
  console.log("\n\n --- System Prompt --- \n\n", systemPrompt);

  try {
    const isO1Model =
      model === "o1-mini-2024-09-12" || model === "o1-preview-2024-09-12";
    if (!isPromptWithinContextWindow(userPrompt, systemPrompt, model)) {
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

    if (
      (model === "claude-3-5-sonnet-20241022" ||
        model === "claude-3-5-haiku-20241022") &&
      !isJSONMode
    ) {
      return sendAnthropicRequest(
        userPrompt,
        systemPrompt,
        temperature,
        baseEventData,
        retries,
        delay,
      );
    }

    let openai: OpenAI;
    if (model?.startsWith("llama3.1")) {
      openai = new OpenAI({
        apiKey: process.env.CEREBRAS_API_KEY,
        baseURL: "https://api.cerebras.ai/v1",
      });
    } else {
      openai = new OpenAI({
        apiKey: "using-virtual-portkey-key",
        baseURL: PORTKEY_GATEWAY_URL,
        defaultHeaders: {
          "x-portkey-api-key": process.env.PORTKEY_API_KEY,
          "x-portkey-virtual-key": PORTKEY_VIRTUAL_KEYS[model],
          "x-portkey-cache": "simple",
          "x-portkey-retry-count": "3",
        },
      });
    }

    const max_tokens = MAX_OUTPUT[model];

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ] as OpenAI.Chat.ChatCompletionMessageParam[];

    if (imagePrompt) {
      messages.unshift(imagePrompt);
    }

    const needsJsonHelper = isJSONMode && model.includes("claude");

    if (needsJsonHelper) {
      messages.push({
        role: "assistant",
        content:
          "Here is the requested JSON that adheres perfectly to the schema noted above:\n```json\n{",
      });
    }

    if (isJSONMode && !systemPrompt.includes("JSON")) {
      systemPrompt +=
        "\n You must only respond in JSON with no other text. If you do not respond ONLY in JSON, the user will be unable to parse your response.";
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

    if (isO1Model) {
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
    let content = gptResponse?.content ?? "";
    if (needsJsonHelper) {
      content = `{${content}`;
    }

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
        responsePrompt: content,
      });
    }

    return content;
  } catch (error) {
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

export const sendGptRequestWithSchema = async (
  userPrompt: string,
  systemPrompt: string,
  zodSchema: ZodSchema<any>,
  temperature = 0.2,
  baseEventData: BaseEventData | undefined = undefined,
  retries = 3,
  model: Model = "claude-3-5-sonnet-20241022",
): Promise<any> => {
  let extractedInfo;
  let retryCount = 0;

  while (retryCount < retries) {
    let gptResponse: string | null = null;
    if (retryCount > 0) {
      systemPrompt = `Attempt #${retryCount + 1} - ${systemPrompt}`;
    }

    try {
      gptResponse = await sendGptRequest(
        userPrompt,
        systemPrompt,
        temperature,
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
      gptResponse = removeMarkdownCodeblocks(gptResponse);
      extractedInfo = parse(gptResponse);
      if (Array.isArray(extractedInfo)) {
        const validatedInfo = extractedInfo.map((info) =>
          zodSchema.safeParse(info),
        );
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

        return (validatedInfo as SafeParseSuccess<any>[]).map(
          (result) => result.data,
        );
      }

      const validationResult = zodSchema.safeParse(extractedInfo);

      if (validationResult.success) {
        return validationResult.data;
      }

      throw new Error(
        `Invalid response from GPT - object is not able to be parsed using the provided schema: ${JSON.stringify(
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
      defaultHeaders: {
        "x-portkey-api-key": process.env.PORTKEY_API_KEY,
        "x-portkey-virtual-key": PORTKEY_VIRTUAL_KEYS[model],
        "x-portkey-cache": "simple",
        "x-portkey-retry-count": "3",
        "x-portkey-debug": `${process.env.NODE_ENV !== "production"}`,
      },
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
    defaultHeaders: {
      "x-portkey-api-key": process.env.PORTKEY_API_KEY,
      "x-portkey-virtual-key": PORTKEY_VIRTUAL_KEYS[model],
      "x-portkey-cache": "simple",
      "x-portkey-retry-count": "3",
      "x-portkey-debug": `${process.env.NODE_ENV !== "production"}`,
    },
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
