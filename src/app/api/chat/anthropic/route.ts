import { Role, type Message } from "~/types";
import { type NextRequest } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";
import { convertToCoreMessages, streamText } from "ai";
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

    const context = contextItems
      .map((c) => `${c.file}: ${c.overview} \n\n ${c.text}`)
      .join("\n");

    const codebasePrompt = getCodebasePrompt(context);

    const cachedPrompts: {
      type: "text";
      text: string;
      experimental_providerMetadata?: any;
    }[] = [
      {
        type: "text",
        text: codebasePrompt,
        experimental_providerMetadata: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      },
    ];

    // create a new user message with the full codeFiles content

    if (codeContent && codeContent.length > 0) {
      const codeFilesContent = codeContent
        .map((c) => `${c.path}: ${c.content}`)
        .join("\n\n");
      cachedPrompts.push({
        type: "text",
        text: `Here are the code file or files that are related to the user's query: ${codeFilesContent}`,
        experimental_providerMetadata: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      });
    }

    // find the first user message. Add the codebase context to it and cache it. Here is an example
    const userMessage = messages.find((m) => m.role === Role.USER);
    if (!userMessage) {
      return new Response("User message is required", { status: 400 });
    }
    cachedPrompts.push({
      type: "text",
      text: userMessage.content,
    });

    // now add the codebase context to the existing user message
    const newUserMessage = {
      ...userMessage,
      content: cachedPrompts,
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

    // Initialize the stream using @ai-sdk/anthropic
    const result = await streamText({
      model: anthropic(model.modelName, {
        cacheControl: true,
      }),
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

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Error with chat endpoint", error);
    console.log(JSON.stringify(error));
    return new Response("Error with chat endpoint", { status: 500 });
  }
}
