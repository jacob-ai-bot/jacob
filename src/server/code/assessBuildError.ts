import { z } from "zod";

import { type BaseEventData, parseTemplate } from "../utils";
import { sendGptRequestWithSchema } from "../openai/request";

export const AssessmentSchema = z.object({
  errors: z.array(
    z.object({
      filePath: z.string().optional(), // The path to the file that contains the error
      error: z.string().optional(), // The exact, specific error message that was found
      code: z.string().optional(), // The code that caused the error
      startingLineNumber: z.number().optional(), // The line number where the error starts
      endingLineNumber: z.number().optional(), // The line number where the error ends
    }),
  ), // An array of all of the errors that were found in the build
  filesToUpdate: z.array(z.string()).optional(), // an array of file paths that need to be updated to resolve the errors
  needsNpmInstall: z.boolean().nullish(), // Whether or not the errors are caused by a missing dependency
  npmPackageToInstall: z.string().nullish(), // If a dependency is missing, provide the name of the npm package that needs to be installed (just the name, not the command i.e. "lodash" instead of "npm install lodash")
});

export type Assessment = z.infer<typeof AssessmentSchema>;

export interface AssessBuildErrorParams extends BaseEventData {
  sourceMap: string;
  errors: string;
}

export async function assessBuildError(params: AssessBuildErrorParams) {
  const { sourceMap, errors, ...baseEventData } = params;
  const templateParams = {
    sourceMap,
    errors,
  };
  // TODO: handle multiple assessments
  // TODO: include code in user prompt
  const assessBuildErrorSystemPrompt = parseTemplate(
    "dev",
    "code_assess_build_error",
    "system",
    templateParams,
  );
  const assessBuildErrorUserPrompt = parseTemplate(
    "dev",
    "code_assess_build_error",
    "user",
    templateParams,
  );
  const assessment = (await sendGptRequestWithSchema(
    assessBuildErrorUserPrompt,
    assessBuildErrorSystemPrompt,
    AssessmentSchema,
    0.2,
    baseEventData,
  )) as Assessment;

  return assessment;
}
