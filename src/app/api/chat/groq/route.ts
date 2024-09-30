import { Role, type Message } from "~/types";
import { type NextRequest } from "next/server";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { convertToCoreMessages, streamText, tool } from "ai";
import { type ChatModel } from "~/app/dashboard/[org]/[repo]/chat/components/ModelSelector";
import { type ContextItem } from "~/server/utils/codebaseContext";
import { getCodebasePrompt, systemPrompt } from "../prompts";
import { tools } from "../tools";
import { type CodeFile } from "~/app/dashboard/[org]/[repo]/chat/components/Chat";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const {
      messages,
      model,
      contextItems,
      temperature = 0.3,
      codeContent,
    } = (await req.json()) as {
      messages: Message[];
      model: ChatModel;
      contextItems: ContextItem[];
      temperature: number;
      codeContent: CodeFile[] | undefined;
    };
    if (!model) {
      return new Response("Model is required", { status: 400 });
    }
    if (!contextItems) {
      return new Response("No context items provided", { status: 200 });
    }

    // Groq has very limited context window and rate limits
    // const context = contextItems
    //   .map((c) => `${c.file}: ${c.overview}`)
    //   .join("\n");

    const prompts: {
      type: "text";
      text: string;
    }[] = [];
    if (codeContent) {
      codeContent.map((c) => {
        const codebasePrompt = getCodebasePrompt(`${c.path}: ${c.content}`);
        prompts.push({
          type: "text",
          text: codebasePrompt,
        });
      });
    }

    // find the first user message. Add the codebase context to it and cache it. Here is an example
    const userMessage = messages.find((m) => m.role === Role.USER);
    if (!userMessage) {
      return new Response("User message is required", { status: 400 });
    }
    prompts.push({
      type: "text",
      text: userMessage.content,
    });

    // now add the codebase context to the existing user message
    const newUserMessage = {
      ...userMessage,
      content: prompts,
    };

    // replace the first user message with the new user message. ONLY replace the first one.
    let hasReplacedMessage = false;
    const newMessages = [];
    for (const m of messages) {
      if (m.role === Role.USER && !hasReplacedMessage) {
        newMessages.push(newUserMessage);
        hasReplacedMessage = true;
      } else {
        newMessages.push(m);
      }
    }

    // BUGBUG remove any toolInvocations values from the messages
    const messagesWithoutToolInvocations = newMessages.map((m) => {
      return {
        role: m.role,
        content: m.content,
      };
    });

    const groq = createOpenAI({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY,
    });

    // Initialize the stream using @ai-sdk/anthropic
    const result = await streamText({
      model: groq(model.modelName),
      messages: convertToCoreMessages(
        messagesWithoutToolInvocations as Message[],
      ),
      system: systemPrompt,
      temperature,
      tools,
      toolChoice: "auto",
      maxTokens: 8000,
      experimental_toolCallStreaming: true,
    });
    console.log("result", result);
    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Error with chat endpoint", error);
    // console.log(JSON.stringify(error));
    return new Response("Error with chat endpoint", { status: 500 });
  }
}
