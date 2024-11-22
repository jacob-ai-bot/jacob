/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { describe, test, expect, afterEach, afterAll, vi } from "vitest";

import { parseBuildErrors } from "./llmParseErrors";

const mockedRequest = vi.hoisted(() => ({
  sendGptRequestWithSchema: vi.fn().mockResolvedValue({ errors: [] }),
}));
vi.mock("~/server/openai/request", () => mockedRequest);

describe("parseBuildErrors", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  test("success", async () => {
    const buildOutput = "Build successful";
    const result = await parseBuildErrors(buildOutput);

    expect(result).toStrictEqual([]);

    expect(mockedRequest.sendGptRequestWithSchema).toHaveBeenCalledOnce();
    expect(mockedRequest.sendGptRequestWithSchema.mock.lastCall![0]).toContain(
      "Analyze the following build output and extract error information.",
    );
    expect(mockedRequest.sendGptRequestWithSchema.mock.lastCall![0]).toContain(
      buildOutput,
    );
    expect(mockedRequest.sendGptRequestWithSchema.mock.lastCall![1]).toContain(
      "You are an expert in analyzing build outputs and extracting error information. Your response MUST be an array of objects that adhere to a given zod schema. Do not include any additional information in your response.",
    );
    expect(mockedRequest.sendGptRequestWithSchema.mock.lastCall![5]).toBe(
      5, // retries
    );
    expect(mockedRequest.sendGptRequestWithSchema.mock.lastCall![6]).toBe(
      "claude-3-5-sonnet-20241022",
    );
  });
});
