import { type Task, type Message, type Developer } from "~/types";

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
    const { messages, task, developer } = (await req.json()) as {
      messages: Message[];
      task: Task;
      developer: Developer;
    };

    const issue = task?.issue ?? undefined;

    let systemPrompt = issue ? chatClarifyIssueSystem : chatCreateIssueSystem;
    if (issue?.description?.includes("figma.com")) {
      systemPrompt = chatShowFigmaSystem;
    }
    const temperature = 0.3;
    const model = "gpt-4o";

    if (issue) {
      systemPrompt = systemPrompt.replace("{{issue}}", JSON.stringify(issue));
    }
    if (developer?.personalityProfile) {
      systemPrompt = systemPrompt.replace(
        "{{personalityProfile}}",
        developer.personalityProfile,
      );
    }
    console.log("systemPrompt", systemPrompt);

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
