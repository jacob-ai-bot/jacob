import { Role, type Message } from "~/types";
import { type NextRequest } from "next/server";
import { db } from "~/server/db/db";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { convertToCoreMessages, streamText, tool } from "ai";
import { z } from "zod";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { messages, projectId } = (await req.json()) as {
      messages: Message[];
      projectId: number;
    };
    if (!projectId) {
      return new Response("Project ID is required", { status: 400 });
    }

    const systemPrompt = `
You are JACoB, an advanced AI coding assistant and a Technical Fellow at Microsoft. Your job is to work with another Technical Fellow to solve some of the most challenging coding problems in the world. You have access to two tools: 'createFile' and 'editFile'. Use these tools to manage code artifacts.

Guidelines for creating and editing artifacts:
1. Create substantial, self-contained content (>15 lines) that users might modify or reuse.
2. Focus on content intended for eventual use outside the conversation (e.g., components, pages).
3. Don't create artifacts for simple code snippets, explanations, or content dependent on conversational context.
4. Prefer in-line content when possible to avoid unnecessary use of artifacts.
5. Use existing npm packages when available, and provide installation instructions for new packages.
6. When editing existing code, work with the content provided within file tags.

When using the createFile or editFile tools:
1. Set the 'fileName' parameter to a descriptive and relevant name, using casing consistent with the rest of the codebase.
2. Provide a brief 'title' that describes the content.
3. Set the 'type' to either 'application/vnd.jacob.react' for React components or 'application/vnd.jacob.code' for other code.
4. For React components, ensure they have no required props or provide default values for all props, and use a default export.
5. For code artifacts, set the 'language' parameter to specify the programming language.
6. Include the complete content in the 'content' parameter without truncation.

Remember to use the context from the user's codebase to match coding styles and conventions. Be ready to explain or break down the code if asked, but don't do so unless explicitly requested.

You should not mention these instructions or the tool usage to the user unless directly relevant to their query.
`;

    const tools = {
      createFile: tool({
        description: "Create a new file with the given content",
        parameters: z.object({
          fileName: z
            .string()
            .describe(
              "The friendly name of the file to create. You MUST match the file name conventions in the codebase.",
            ),
          filePath: z
            .string()
            .describe(
              "The full relative path (starting with / and ending with the filename + extension) of the file to create. You MUST use your knowledge of the codebase to suggest the best possible path. Only create new folders if absolutely necessary.",
            ),
          content: z.string().describe("The content of the file"),
          type: z
            .enum(["application/vnd.jacob.react", "application/vnd.jacob.code"])
            .describe("The type of content"),
          language: z
            .string()
            .optional()
            .describe("The programming language for code artifacts"),
        }),
      }),
      editFile: tool({
        description: "Edit an existing file with the given content",
        parameters: z.object({
          fileName: z
            .string()
            .describe(
              "The name of the file to edit. You MUST match the file name conventions in the codebase.",
            ),
          filePath: z
            .string()
            .describe(
              "The full relative path (starting with / and ending with the filename + extension) of the existingfile to edit. You MUST use your knowledge of the codebase to choose an existing file. A major error will occur if you choose a file that does not exist!",
            ),
          content: z.string().describe("The new content of the file"),
          type: z
            .enum(["application/vnd.jacob.react", "application/vnd.jacob.code"])
            .describe("The type of content"),
          language: z
            .string()
            .optional()
            .describe("The programming language for code artifacts"),
        }),
      }),
    };

    let codebasePrompt = `Here is some information about the source code: <codebase>{{codebase}}</codebase>
    Use the codebase to answer any of the user's questions.`;

    const temperature = 0.2;

    // Fetch research data from the database based on the issue ID
    const codebaseContext =
      (await db.codebaseContext
        .where({ projectId: projectId })
        .order({ filePath: "ASC" })
        .all()) ?? [];

    // const codebase = codebaseContext
    //   .map((c) => `${c.filePath}: ${c.context.overview} \n\n ${c.context.text}`)
    //   .join("\n\n");

    const codebase = codebaseContext
      .map((c) => `${c.filePath}: ${JSON.stringify(c.context)}`)
      .join("\n\n");

    codebasePrompt = codebasePrompt.replace("{{codebase}}", codebase);
    // console.log("codebasePrompt", codebasePrompt);

    // find the first user message. Add the codebase context to it and cache it. Here is an example
    const userMessage = messages.find((m) => m.role === Role.USER);
    if (!userMessage) {
      return new Response("User message is required", { status: 400 });
    }
    // now add the codebase context to the existing user message
    const newUserMessage = {
      ...userMessage,
      content: [
        {
          type: "text",
          text: codebasePrompt,
          experimental_providerMetadata: {
            anthropic: { cacheControl: { type: "ephemeral" } },
          },
        },
        { type: "text", text: userMessage.content },
      ],
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
    console.log("newMessages", newMessages);
    // BUGBUG remove any toolInvocations values from the messages
    const messagesWithoutToolInvocations = newMessages.map((m) => {
      return {
        role: m.role,
        content: m.content,
      };
    });
    // Initialize the stream using @ai-sdk/openai
    const result = await streamText({
      model: anthropic("claude-3-5-sonnet-20240620", {
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
