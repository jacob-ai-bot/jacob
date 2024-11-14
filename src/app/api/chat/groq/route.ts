import { Role, type Message } from "~/types";
import { type NextRequest } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToCoreMessages, streamText } from "ai";
import { type ChatModel } from "~/app/dashboard/[org]/[repo]/chat/components/ModelSelector";
import { type ContextItem } from "~/server/utils/codebaseContext";
import { getCodebasePrompt, systemPrompt } from "../prompts";
import { simplifiedTools } from "../tools";
import { type CodeFile } from "~/app/dashboard/[org]/[repo]/chat/components/Chat";
import { countTokens, getModelTokenLimit } from "~/server/openai/request";

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

    const prompts: {
      type: "text";
      text: string;
    }[] = [];
    if (codeContent) {
      codeContent.map((c) => {
        const codebasePrompt = getCodebasePrompt(
          `The user is specifically asking for information related to this file. If the user is asking for changes, it is critically important to ALWAYS use the "editFile" tool. ${c.path}: ${c.content}`,
        );
        prompts.push({
          type: "text",
          text: codebasePrompt,
        });
      });
    }

    const userMessage = messages.find((m) => m.role === Role.USER);
    if (!userMessage) {
      return new Response("User message is required", { status: 400 });
    }
    prompts.push({
      type: "text",
      text: userMessage.content,
    });

    const newUserMessage = {
      ...userMessage,
      content: prompts,
    };

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

    const messagesWithoutToolInvocations = newMessages.map((m) => {
      return {
        role: m.role,
        content:
          m.content?.length > 0
            ? m.content
            : JSON.stringify(m) ?? "empty message",
      };
    });

    const totalTokens = messagesWithoutToolInvocations.reduce(
      (acc, msg) => acc + countTokens(msg.content, model.modelName),
      0,
    );
    const tokenLimit = getModelTokenLimit(model.modelName);

    if (totalTokens > tokenLimit) {
      return new Response(
        "The combined length of your message and context exceeds the token limit. Please shorten your message or context.",
        { status: 400 },
      );
    }

    const groq = createOpenAI({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY ?? "",
    });

    const coreMessages = convertToCoreMessages(
      messagesWithoutToolInvocations as Message[],
    );

    const result = await streamText({
      model: groq(model.modelName),
      messages: coreMessages,
      system: systemPrompt,
      temperature: codeContent ? 0.0 : temperature,
      tools: simplifiedTools,
      toolChoice: codeContent ? "required" : "auto",
      maxTokens: 8000,
    });
    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Error with chat endpoint");
    return new Response("Error with chat endpoint", { status: 500 });
  }
}
