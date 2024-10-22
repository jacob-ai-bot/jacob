/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import Anthropic from "@anthropic-ai/sdk";
import { type BaseEventData } from "../utils";
import { emitPromptEvent } from "../utils/events";

const ONE_MILLION = 1000000;

export const CONTEXT_WINDOW = {
  "claude-3-opus-20240229": 200000,
  "claude-3-haiku-20240307": 200000,
  "claude-3-5-sonnet-20240620": 200000,
  "claude-3-5-sonnet-20241022": 200000,
} as const;

export const MAX_OUTPUT = {
  "claude-3-opus-20240229": 4096,
  "claude-3-haiku-20240307": 4096,
  "claude-3-5-sonnet-20240620": 8192,
  "claude-3-5-sonnet-20241022": 8192,
} as const;

const INPUT_TOKEN_COSTS = {
  "claude-3-opus-20240229": 15 / ONE_MILLION,
  "claude-3-haiku-20240307": 0.25 / ONE_MILLION,
  "claude-3-5-sonnet-20240620": 3 / ONE_MILLION,
  "claude-3-5-sonnet-20241022": 3 / ONE_MILLION,
} as const;

const OUTPUT_TOKEN_COSTS = {
  "claude-3-opus-20240229": 75 / ONE_MILLION,
  "claude-3-haiku-20240307": 1.25 / ONE_MILLION,
  "claude-3-5-sonnet-20240620": 15 / ONE_MILLION,
  "claude-3-5-sonnet-20241022": 15 / ONE_MILLION,
} as const;

export type Model = keyof typeof CONTEXT_WINDOW;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  defaultHeaders: {
    "anthropic-beta": "max-tokens-3-5-sonnet-2024-07-15",
  },
});

export const sendAnthropicRequest = async (
  userPrompt: string,
  systemPrompt = "You are a helpful assistant.",
  temperature = 0.2,
  baseEventData: BaseEventData | undefined = undefined,
  retries = 10,
  delay = 60000,
  model: Model = "claude-3-5-sonnet-20240620",
  isJSONMode = false,
): Promise<string | null> => {
  try {
    const max_tokens = MAX_OUTPUT[model];

    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: userPrompt },
    ];

    console.log(
      `\n +++ Calling ${model} with the Anthropic API with max_tokens: ${max_tokens} `,
    );
    const startTime = Date.now();
    const response: Anthropic.Messages.Message =
      await anthropic.messages.create({
        model,
        messages,
        max_tokens,
        temperature,
        system: systemPrompt,
      });
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`\n +++ ${model} Response time ${duration} ms`);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!response?.content?.length) {
      throw new Error("No content in response");
    }

    const content =
      response.content![0]!.type === "text" ? response.content![0]!.text : "";

    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
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
          promptType: message.role as "User" | "System" | "Assistant",
          prompt:
            typeof message.content === "string"
              ? message.content
              : JSON.stringify(message.content),
        })),
        responsePrompt: content,
      });
    }
    console.log(`\n\nResponse: ${content}\n\n`);

    return content as string;
  } catch (error) {
    if (retries === 0) {
      console.error(`Error in Anthropic request: ${String(error)}`);
      throw error;
    } else {
      console.error(`Error in Anthropic request: ${String(error)}`);
      console.log(
        `Error occurred, retries remaining: ${retries}. Retrying in ${delay} ms...`,
      );
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          sendAnthropicRequest(
            userPrompt,
            systemPrompt,
            temperature,
            baseEventData,
            retries - 1,
            delay * 2,
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
