import { z } from "zod";

export const ExtractedIssueInfoSchema = z.object({
  stepsToAddressIssue: z.string().nullable().optional(), // a step-by-step plan of how a developer would address the given issue
  filesToCreate: z.array(z.string()).nullable().optional(), // an array of file paths that will be created by the developer. The paths CANNOT be in the list of valid file names.
  filesToUpdate: z.array(z.string()).nullable().optional(), // an array of file paths that will be updated by the developer
});

export type ExtractedIssueInfo = z.infer<typeof ExtractedIssueInfoSchema>;
