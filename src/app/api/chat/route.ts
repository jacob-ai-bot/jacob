import { type Message, type Developer } from "~/types";
import { type Todo } from "~/server/api/routers/events";

import {
  chatCreateIssueSystem,
  chatClarifyIssueSystem,
  chatShowFigmaSystem,
} from "./chat_prompts";
import { OpenAIStream } from "~/server/openai/request";
import { type NextRequest } from "next/server";

// export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { messages, todo, developer } = (await req.json()) as {
      messages: Message[];
      todo: Todo;
      developer: Developer;
    };

    let systemPrompt = todo ? chatClarifyIssueSystem : chatCreateIssueSystem;
    if (todo?.description?.includes("figma.com")) {
      systemPrompt = chatShowFigmaSystem;
    }
    const temperature = 0.2;
    const model = "gpt-4o";

    if (todo) {
      systemPrompt = systemPrompt.replace("{{todo}}", JSON.stringify(todo));
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
