import { type Message } from "~/types";
import { type NextRequest } from "next/server";
import { db } from "~/server/db/db";
import { openai } from "@ai-sdk/openai";
import { convertToCoreMessages, streamText } from "ai";

export async function POST(req: NextRequest) {
  try {
    const { messages, projectId } = (await req.json()) as {
      messages: Message[];
      projectId: number;
    };
    if (!projectId) {
      return new Response("Project ID is required", { status: 400 });
    }

    let systemPrompt = `Act as a Technical Fellow at Microsoft. You are the world's best developer. 
      Your job is work with another Technical Fellow to solve some of the most challenging coding problems in the world. 
      Here is some information about the source code: {{codebase}}`;

    const temperature = 0.2;

    // Fetch research data from the database based on the issue ID
    const codebaseContext =
      (await db.codebaseContext
        .where({ projectId: projectId })
        .order({ filePath: "ASC" })
        .all()) ?? [];

    const codebase = codebaseContext
      .map((c) => `${c.filePath}: ${c.context.overview}`)
      .join("\n");

    systemPrompt = systemPrompt.replace("{{codebase}}", codebase);
    console.log("systemPrompt", systemPrompt);

    // Initialize the stream using @ai-sdk/openai
    const result = await streamText({
      model: openai("gpt-4o"),
      messages: convertToCoreMessages(messages),
      system: systemPrompt,
      temperature,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error(error);
    return new Response("Error with chat endpoint", { status: 500 });
  }
}
