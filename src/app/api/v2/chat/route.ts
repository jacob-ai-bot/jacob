import { type Message, type Developer } from "~/types";
import { type Todo } from "~/server/api/routers/events";

import {
  chatCreateIssueSystem,
  chatClarifyIssueSystem,
  chatShowFigmaSystem,
} from "../chat/chat_prompts";
import { OpenAIStream } from "~/server/openai/request";
import { type NextRequest } from "next/server";
import { db } from "~/server/db/db";

// export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { messages, todo, developer, sourceMap } = (await req.json()) as {
      messages: Message[];
      todo: Todo;
      developer: Developer;
      sourceMap: string;
    };

    let systemPrompt = todo ? chatClarifyIssueSystem : chatCreateIssueSystem;
    if (todo?.description?.includes("figma.com")) {
      systemPrompt = chatShowFigmaSystem;
    }
    const temperature = 0.2;
    const model = "gpt-4o-2024-08-06";

    if (todo) {
      systemPrompt = systemPrompt.replace("{{todo}}", JSON.stringify(todo));
      // Fetch research data from the database based on the issue ID
      const researchData = await db.research
        .where({ issueId: todo.issueId })
        .all();
      if (researchData?.length > 0) {
        // Convert the fetched research data into a string of question/answers
        const research = researchData
          .map((item) => `Question: ${item.question}\nAnswer: ${item.answer}`)
          .join("\n\n");

        systemPrompt = systemPrompt.replace("{{research}}", research);
      }
    }
    if (sourceMap) {
      systemPrompt = systemPrompt.replace("{{sourceMap}}", sourceMap);
    }
    if (developer?.personalityProfile) {
      systemPrompt = systemPrompt.replace(
        "{{personalityProfile}}",
        developer.personalityProfile,
      );
    }

    // Initialize the stream
    const completionStream = await OpenAIStream(
      model,
      messages,
      systemPrompt,
      temperature,
    );

    return new Response(completionStream.toReadableStream());
  } catch (error) {
    console.error(error);
    return new Response("Error with chat endpoint", { status: 500 });
  }
}
