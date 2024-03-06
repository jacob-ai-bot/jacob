import { z } from "zod";

import { parseTemplate } from "../utils";
import { sendGptRequestWithSchema } from "../openai/request";

export const AssessmentSchema = z.object({
  causeOfErrors: z.string(), // A summary of what caused the errors
  ideasForFixingError: z.string(), // A list of ideas for fixing the errors. Bias towards ideas that change the file that caused the errors, not modifying other files.
  suggestedFixes: z.string(), // The suggested fixes to the code to make the build and tests succeed. Your first choice should bias towards changing the file that caused the errors. You may also suggest that the user comment out some code that is causing the issue.
  needsNpmInstall: z.boolean().optional(), // Whether or not the errors are caused by a missing dependency
  npmPackageToInstall: z.string().optional(), // If a dependency is missing, provide the name of the npm package that needs to be installed (just the name, not the command i.e. "lodash" instead of "npm install lodash")
});

export type Assessment = z.infer<typeof AssessmentSchema>;

export async function assessBuildError(errors: string) {
  // TODO: handle multiple assessments
  // TODO: include code in user prompt
  const assessBuildErrorTemplateParams = {
    errors,
  };

  const assessBuildErrorSystemPrompt = parseTemplate(
    "dev",
    "code_assess_build_error",
    "system",
    assessBuildErrorTemplateParams,
  );
  const assessBuildErrorUserPrompt = parseTemplate(
    "dev",
    "code_assess_build_error",
    "user",
    assessBuildErrorTemplateParams,
  );
  const assessment = (await sendGptRequestWithSchema(
    assessBuildErrorUserPrompt,
    assessBuildErrorSystemPrompt,
    AssessmentSchema,
    0.1,
  )) as Assessment;

  return assessment;
}
