import { sendGptRequestWithSchema } from "~/server/openai/request";
import { z } from "zod";

export type ErrorInfo = {
  filePath: string;
  lineNumber: number;
  errorType: string;
  errorMessage: string;
};

const ErrorInfoSchema = z.object({
  errors: z.array(
    z.object({
      filePath: z.string().nullable(),
      lineNumber: z.number().nullable(),
      errorType: z.string().nullable(),
      errorMessage: z.string().nullable(),
    }),
  ),
});

export type ParsedErrors = z.infer<typeof ErrorInfoSchema>;

/**
 * Parses the build output to extract structured error information.
 * This function is crucial for understanding the nature and location of each error,
 * allowing the system to target fixes more accurately.
 *
 * @param buildOutput - The raw build output containing error messages.
 * @returns An array of ErrorInfo objects, each representing a parsed error.
 */

export async function parseBuildErrors(
  buildOutput: string,
): Promise<ErrorInfo[]> {
  console.log("Parsing build errors for buildOutput:", buildOutput);

  const prompt = `
    Analyze the following build output and extract error information.
    For each error, provide the following details:
    - filePath: The path of the file where the error occurred
    - lineNumber: The line number where the error occurred (as a number)
    - errorType: The type or category of the error
    - errorMessage: The detailed error message

    Build Output:
    ${buildOutput}

    Respond with a JSON array of error objects, each containing the above fields.
    Your response MUST be a JSON object of errors that adhere to the following zod schema:
    {
     errors: z.array(
      z.object({
        filePath: z.string(),
        lineNumber: z.number(),
        errorType: z.string(),
        errorMessage: z.string(),
      }),
     )
    }
    
    Here is an example response:
    {
      "errors": [
        {
          "filePath": "src/index.ts",
          "lineNumber": 10,
        "errorType": "SyntaxError",
        "errorMessage": "Unexpected token 'const'"
      },
      {
        "filePath": "src/utils.ts",
        "lineNumber": 20,
        "errorType": "TypeError",
        "errorMessage": "Cannot read property 'map' of undefined"
      }
    ]
    }

    If you can't determine a value, use an empty string for string fields or 0 for lineNumber.
  `;

  try {
    const parsedErrors = (await sendGptRequestWithSchema(
      prompt,
      "You are an expert in analyzing build outputs and extracting error information. Your response MUST be an array of objects that adhere to a given zod schema. Do not include any additional information in your response.",
      ErrorInfoSchema,
      0.2,
      undefined,
      5,
      "gpt-4-turbo-2024-04-09",
    )) as ParsedErrors;
    const errors = parsedErrors.errors;

    console.log("Parsed errors:", errors);
    return errors as ErrorInfo[];
  } catch (error) {
    console.error("Error parsing build errors:", error);
    return [];
  }
}
