import { describe, it, expect, vi } from "vitest";
import { evaluateIssue, evaluateJiraIssue } from "./evaluateIssue";
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
});

describe("evaluateJiraIssue", () => {
  it("should return a score and feedback when score is less than 4", async () => {
    const mockEvaluation = {
      evaluationScore: 3.5,
      feedback:
        "The issue description needs more detail about the expected functionality.",
    };

    vi.mocked(openaiRequest.sendGptRequestWithSchema).mockResolvedValue(
      mockEvaluation,
    );

    const result = await evaluateJiraIssue({
      issueTitle: "Add new feature",
      issueDescription: "Implement the new feature.",
    });

    expect(result).toEqual(mockEvaluation);
    expect(openaiRequest.sendGptRequestWithSchema).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(Object),
      0.4,
      undefined,
      3,
      "gpt-4-turbo-2023-05-23",
    );
  });

  it("should return only evaluationScore when score is 4 or higher", async () => {
    const mockEvaluation = {
      evaluationScore: 4.5,
      feedback: "",
    };

    vi.mocked(openaiRequest.sendGptRequestWithSchema).mockResolvedValue(
      mockEvaluation,
    );

    const result = await evaluateJiraIssue({
      issueTitle: "Implement user login",
      issueDescription:
        "Implement a user login system with email and password authentication. The system should validate user credentials against the database and handle session management.",
    });

    expect(result).toEqual(mockEvaluation);
    expect(openaiRequest.sendGptRequestWithSchema).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(Object),
      0.4,
      undefined,
      3,
      "gpt-4-turbo-2023-05-23",
    );
  });
});
