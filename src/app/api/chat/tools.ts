import { tool } from "ai";
import { z } from "zod";

export const tools = {
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
          "The full relative path (starting with '/' and ending with the filename and extension) of the file to create. You MUST use your knowledge of the codebase to suggest the best possible path. Only create new folders if absolutely necessary.",
        ),
      content: z
        .string()
        .describe(
          "The content of the file. This MUST be the full content of the file, not a truncated version.",
        ),
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
          "The full relative path (starting with '/' and ending with the filename and extension) of the existing file to edit. You MUST use your knowledge of the codebase to choose an existing file. A major error will occur if you choose a file that does not exist!",
        ),
      content: z
        .string()
        .describe(
          "The new content of the file. This MUST be the full content of the file, not a truncated version.",
        ),
      language: z
        .string()
        .optional()
        .describe("The programming language for code artifacts"),
    }),
  }),
};
