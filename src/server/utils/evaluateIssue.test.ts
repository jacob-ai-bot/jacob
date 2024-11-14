import { describe, it, expect, vi } from "vitest";
import { evaluateIssue } from "./evaluateIssue";
import * as openaiRequest from "../openai/request";
import { PlanningAgentActionType } from "../db/enums";
import { type StandardizedPath } from "./files";

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

    const result = await evaluateIssue({
      githubIssue: "Implement user authentication",
      planSteps: [
        {
          instructions:
            "1. Create login form\n2. Implement API endpoint\n3. Add JWT token handling",
          type: PlanningAgentActionType.EditExistingCode,
          filePath: "src/auth/login.tsx" as StandardizedPath,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          id: 1,
          projectId: 1,
          isActive: true,
          issueNumber: 1,
          title: "Implement user authentication",
          exitCriteria: "",
          dependencies: "",
        },
      ],
      research: "Similar authentication systems exist in the codebase",
      totalFiles: 100,
      contextItems: [
        {
          file: "src/auth/login.tsx" as StandardizedPath,
          code: ["// existing login code"],
          text: "// existing login code",
          importStatements: [],
          diagram: "",
          overview: "",
          taxonomy: "",
          importedFiles: [],
          exports: [],
        },
      ],
    });

    expect(result).toEqual(mockEvaluation);
    expect(openaiRequest.sendGptRequestWithSchema).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(Object),
      0.4,
      undefined,
      3,
      "claude-3-5-sonnet-20241022",
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

    const result = await evaluateIssue({
      githubIssue: "Empty task",
      planSteps: [],
      research: "",
      totalFiles: 0,
      contextItems: [],
    });

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

    const result = await evaluateIssue({
      githubIssue: "Rewrite entire codebase",
      planSteps: [
        {
          instructions:
            "1. Rewrite everything\n2. Test everything\n3. Deploy everything",
          type: PlanningAgentActionType.EditExistingCode,
          filePath: "src/index.ts" as StandardizedPath,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          id: 1,
          projectId: 1,
          isActive: true,
          issueNumber: 1,
          title: "Rewrite entire codebase",
          exitCriteria: "",
          dependencies: "",
        },
      ],
      research: "This is an impossible task",
      totalFiles: 1000000,
      contextItems: [
        {
          file: "src/index.ts" as StandardizedPath,
          code: ["// everything"],
          text: "// everything",
          importStatements: [],
          diagram: "",
          overview: "",
          taxonomy: "",
          importedFiles: [],
          exports: [],
        },
      ],
    });

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

    await evaluateIssue({
      githubIssue: "Test task",
      planSteps: [
        {
          instructions: "Test plan",
          type: PlanningAgentActionType.EditExistingCode,
          filePath: "test.ts" as StandardizedPath,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          id: 1,
          projectId: 1,
          isActive: true,
          issueNumber: 1,
          title: "Test task",
          exitCriteria: "",
          dependencies: "",
        },
      ],
      research: "Test research",
      totalFiles: 10,
      contextItems: [],
      baseEventData,
    });

    expect(openaiRequest.sendGptRequestWithSchema).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(Object),
      0.4,
      baseEventData,
      3,
      "claude-3-5-sonnet-20241022",
    );
  });
});
