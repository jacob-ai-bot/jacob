import { z } from "zod";

import { parseTemplate } from "../utils";
import { sendGptRequestWithSchema } from "../openai/request";

export const AssessmentSchema = z.object({
  fileName: z.string(), // The name of a specific file that caused the build to fail. Always remove the initial ./ and replace ~/ with src/ when returning this value
  causeOfError: z.string(), // A summary of what caused the build to fail
  ideasForFixingError: z.string(), // A list of ideas for fixing the build error
  suggestedFix: z.string(), // The suggested fix to the code to make the build pass
  needsNpmInstall: z.boolean().optional(), // Whether or not the build error is caused by a missing dependency
  npmPackageToInstall: z.string().optional(), // If a dependency is missing, provide the name of the npm package that needs to be installed (just the name, not the command i.e. "lodash" instead of "npm install lodash")
  success: z.boolean().optional().nullable(),
});

export type Assessment = z.infer<typeof AssessmentSchema>;

export async function assessBuildError(buildError: string) {
  // TODO: handle multiple assessments
  // TODO: include code in user prompt
  const assessBuildErrorTemplateParams = {
    buildError,
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

  assessment.success = false;
  return assessment;
}
