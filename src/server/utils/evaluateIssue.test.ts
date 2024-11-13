import { describe, it, expect, vi } from "vitest";
import { evaluateIssue } from "./evaluateIssue";
import * as openaiRequest from "../openai/request";

vi.mock("../openai/request", () => ({
  sendGptRequestWithSchema: vi.fn(),
}));

describe("evaluateIssue", () => {
  it("should return a valid evaluation object", async () => {
    const mockEvaluation = {
      confidenceScore: 3.5,
      complexityFactors: {
        codeComplexity: "Medium",
        contextUnderstanding: "High",
        riskFactors: "Low",
      },
      specificRiskAreas: ["External API dependencies"],
      estimatedEffort: {
        storyPoints: 3,
        time: "2 days",
        requiredSkillLevel: "Mid-Level Developer",
        skillset: ["React", "TypeScript", "API Integration"],
      },
      recommendations: [
        "Ensure API keys are securely stored",
        "Add unit tests for new components",
      ],
      feedback:
        "Improve the plan by clarifying testing strategies for external APIs, detailing steps more thoroughly, covering edge cases, ensuring secure API key storage, and adding comprehensive unit tests to increase overall confidence and reliability.",
      overallIndicator: "Green",
    };

    vi.mocked(openaiRequest.sendGptRequestWithSchema).mockResolvedValue(
      mockEvaluation,
    );

    const result = await evaluateIssue(
      "Implement user authentication",
      "1. Create login form\n2. Implement API endpoint\n3. Add JWT token handling",
      "Similar authentication systems exist in the codebase",
      100,
      5,
    );

    expect(result).toEqual(mockEvaluation);
    expect(openaiRequest.sendGptRequestWithSchema).toHaveBeenCalledWith(
      expect.stringContaining(
        "Task Description: Implement user authentication",
      ),
      expect.stringContaining(
        "You are an expert software architect and technical evaluator.",
      ),
      expect.any(Object),
      0.2,
      undefined,
      3,
      "gpt-4o-2024-08-06",
    );
  });

  it("should handle edge cases with minimum values", async () => {
    const mockEvaluation = {
      confidenceScore: 0,
      complexityFactors: {
        codeComplexity: "Low",
        contextUnderstanding: "Low",
        riskFactors: "Low",
      },
      specificRiskAreas: [],
      estimatedEffort: {
        storyPoints: 0,
        time: "0 hours",
        requiredSkillLevel: "Junior Developer",
        skillset: [],
      },
      recommendations: [],
      feedback: "The plan needs significant improvement in all areas.",
      overallIndicator: "Red",
    };

    vi.mocked(openaiRequest.sendGptRequestWithSchema).mockResolvedValue(
      mockEvaluation,
    );

    const result = await evaluateIssue("Empty task", "", "", 0, 0);

    expect(result).toEqual(mockEvaluation);
  });

  it("should handle edge cases with maximum values", async () => {
    const mockEvaluation = {
      confidenceScore: 5,
      complexityFactors: {
        codeComplexity: "High",
        contextUnderstanding: "High",
        riskFactors: "High",
      },
      specificRiskAreas: ["Extremely complex task"],
      estimatedEffort: {
        storyPoints: 100,
        time: "1 year",
        requiredSkillLevel: "Principal Architect",
        skillset: ["Everything"],
      },
      recommendations: ["Complete rewrite of the entire system"],
      feedback: "The plan is perfect and cannot be improved further.",
      overallIndicator: "Green",
    };

    vi.mocked(openaiRequest.sendGptRequestWithSchema).mockResolvedValue(
      mockEvaluation,
    );

    const result = await evaluateIssue(
      "Rewrite entire codebase",
      "1. Rewrite everything\n2. Test everything\n3. Deploy everything",
      "This is an impossible task",
      1000000,
      1000000,
    );

    expect(result).toEqual(mockEvaluation);
  });

  it("should pass through baseEventData", async () => {
    const mockEvaluation = {
      confidenceScore: 3,
      complexityFactors: {
        codeComplexity: "Medium",
        contextUnderstanding: "Medium",
        riskFactors: "Medium",
      },
      specificRiskAreas: ["Some risk"],
      estimatedEffort: {
        storyPoints: 5,
        time: "1 week",
        requiredSkillLevel: "Senior Developer",
        skillset: ["JavaScript"],
      },
      recommendations: ["Do something"],
      feedback: "The plan is okay.",
      overallIndicator: "Yellow",
    };

    vi.mocked(openaiRequest.sendGptRequestWithSchema).mockResolvedValue(
      mockEvaluation,
    );

    const baseEventData = {
      projectId: 123,
      repoFullName: "test/repo",
      userId: "user123",
      issueId: 456,
    };

    await evaluateIssue(
      "Test task",
      "Test plan",
      "Test research",
      10,
      2,
      baseEventData,
    );

    expect(openaiRequest.sendGptRequestWithSchema).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(Object),
      0.2,
      baseEventData,
      3,
      "gpt-4o-2024-08-06",
    );
  });
});
