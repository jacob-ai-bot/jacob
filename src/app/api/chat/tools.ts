import { tool } from "ai";
import { z } from "zod";

export const tools = {
  createFile: tool({
    description: "Create a new file based on the user's request",
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
        .describe("The programming language used in the file"),
    }),
  }),
  editFile: tool({
    description: "Edit the existing file based on the user's request",
    parameters: z.object({
      content: z
        .string()
        .describe(
          "The updated content of the existing file. This MUST be the full content of the file, not a truncated version.",
        ),
    }),
  }),
};

export const simplifiedTools = {
  createFile: tool({
    description: "Create a new file based on the user's request",
    parameters: z.object({
      content: z
        .string()
        .describe(
          "The content of the file. This MUST be the full content of the file, not a truncated version.",
        ),
    }),
  }),
  editFile: tool({
    description: "Edit the existing file based on the user's request",
    parameters: z.object({
      content: z
        .string()
        .describe(
          "The new content of the file. This MUST be the full content of the file, not a truncated version.",
        ),
    }),
  }),
};
