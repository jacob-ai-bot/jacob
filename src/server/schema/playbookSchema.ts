import { z } from "zod";

export const nodeSchema = z.object({
  id: z.string(),
  type: z.enum(["actionNode", "controlFlowNode", "annotationNode"]),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: z
    .object({
      label: z.string(),
      actionType: z.enum(["llmCall", "fileOperation", "gitCommand"]).optional(),
      model: z
        .enum([
          "sonnet",
          "gpt4o",
          "gemini",
          "groq",
          "gpt4o-mini",
          "claude-haiku",
        ])
        .optional(),
      prompt: z.string().optional(),
      condition: z.string().optional(),
      note: z.string().optional(),
    })
    .passthrough(), // Allow additional properties for future extensibility
});

export const edgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: z.enum(["default", "conditional"]).optional(),
});

export const playbookSchema = z.object({
  nodes: z.array(nodeSchema),
  edges: z.array(edgeSchema),
});

export const playbookDataSchema = z.object({
  projectId: z.number(),
  name: z.string(),
  description: z.string(),
  playbookData: playbookSchema,
});

export type PlaybookData = z.infer<typeof playbookDataSchema>;
