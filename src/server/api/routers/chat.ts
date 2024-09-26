import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { sendGptRequestWithSchema } from "~/server/openai/request";
import { standardizePath } from "~/server/utils/files";

// Define a Zod schema for the expected response format
const EvaluationSchema = z.object({
  filesEvaluation: z.string(),
  filesToUse: z.array(z.string()).optional().nullable(),
  artifactEvaluation: z.string(),
  shouldCreateArtifact: z.boolean(),
  codeFiles: z.array(z.string()).optional().nullable(),
});

// Type for the expected issue details parsed from the text block
export type Evaluation = z.infer<typeof EvaluationSchema>;

export const chatRouter = createTRPCRouter({
  evaluateChatMessage: protectedProcedure
    .input(
      z.object({
        codeFileStructureContext: z.string(), // this is a string that is  list of file paths with an explanation of what each file does
        messages: z.array(
          z.object({
            role: z.string(),
            content: z.string(),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const { messages, codeFileStructureContext } = input;
        console.log("codeFileStructureContext", codeFileStructureContext);
        console.log("messages", messages);
        if (!messages) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No messages provided",
          });
        }
        const userMessages = messages.filter((m) => m.role === "user");
        if (!userMessages) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No most recent user message provided",
          });
        }
        const mostRecentUserMessage = userMessages[userMessages.length - 1];
        if (!mostRecentUserMessage) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No most recent user message provided",
          });
        }
        const chatHistory = messages
          .slice(0, -1)
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n");

        const userPrompt = `Chat History:
        ${chatHistory}

        Most Recent User Message:
        ${mostRecentUserMessage.content}

        Guidelines for artifact creation:
        1. Artifacts are generally self-contained content (>15 lines) that users might modify or reuse.
        2. Focus on content intended for eventual use outside the conversation (e.g., components, pages).
        3. Don't create artifacts for simple code snippets, explanations, or content dependent on conversational context.
        4. Don't create artifacts unless the user is asking for something that can be done with code.
        5. Always create an artifact if the user is asking for a new file or if the user is asking to modify or add to a file.
 
  Evaluate the chat history and specficically the most recent user message, then provide the structured response.
        `;

        const systemPrompt = `You are an AI coding assistant tasked with evaluating user messages in a chat context. Your job is to prescreen the request to perform an evaluation that will be used to route the request to the correct AI coding agent. Analyze the codebase files, the chat history and the most recent message, then provide a structured evaluation.

<codeFiles>
${codeFileStructureContext}
</codeFiles>

Guidelines for artifact creation:
1. Create substantial, self-contained content (>15 lines) that users might modify or reuse.
2. Focus on content intended for eventual use outside the conversation (e.g., components, pages).
3. Don't create artifacts for simple code snippets, explanations, or content dependent on conversational context.
4. Error on the side of giving an explanation of the codebase and context, rather than creating an artifact, if the user's message is not clear.
5. Always create an artifact if the user is asking for a new file or if the user is asking to modify or add to a file or existing artifact.

Provide your evaluation as a JSON object with the following fields:
1. filesEvaluation: A 1-2 sentence evaluation to determine if the system should use any existing files from the codebase to answer the most recent user message.
2. filesToUse: The specific file or files that the system needs to answer the most recent user message. Only include exactly the full file path of the files that are needed. If no files are needed, return an empty array.
3. artifactEvaluation: A 1-2 sentence evaluation to determine if the system should create an artifact for this request.
4. shouldCreateArtifact: A boolean indicating whether or not to create an artifact.

Your response MUST be in the format of a JSON object that adheres to the following Zod schema:
const EvaluationSchema = z.object({
  filesEvaluation: z.string(),
  filesToUse: z.array(z.string()),
  artifactEvaluation: z.string(),
  shouldCreateArtifact: z.boolean(),
});

Respond only with the JSON object, no additional text.`;

        const temperature = 0.1;

        const evaluationResult = (await sendGptRequestWithSchema(
          userPrompt,
          systemPrompt,
          EvaluationSchema,
          temperature,
          undefined,
          3,
          "llama3.1-70b",
          // "gpt-4o-mini-2024-07-18", // TODO: change this to use cerebas model
        )) as unknown as Evaluation;
        const filesToUse = evaluationResult.filesToUse ?? [];
        evaluationResult.filesToUse = filesToUse.map((p) => standardizePath(p));

        return evaluationResult;
      } catch (error) {
        console.error("Error in evaluateChatMessage", JSON.stringify(error));
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Internal server error",
        });
      }
    }),
});
