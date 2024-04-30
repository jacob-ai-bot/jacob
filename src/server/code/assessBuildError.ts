import { z } from "zod";

import { type BaseEventData, parseTemplate } from "../utils";
import { sendGptRequestWithSchema } from "../openai/request";

export const AssessmentSchema = z.object({
  causeOfErrors: z.string(), // A summary of what caused the errors
  ideasForFixingErrors: z.string(), // A list of ideas for fixing the errors. Bias towards ideas that change the file that caused the errors, not modifying other files.
  suggestedFixes: z.string(), // The suggested fixes to the code to make the build and tests succeed. Your first choice should bias towards changing the file that caused the errors. You may also suggest that the user comment out some code that is causing the issue.
  filesToCreate: z.array(z.string()).optional(), // an array of file paths that need to be created to resolve the errors. The paths CANNOT be in the list of valid file names.
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
