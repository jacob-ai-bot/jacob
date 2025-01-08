import React from "react";
import { type Meta, type Story } from "@storybook/react";
import Plan from "./Plan";
import { type PlanStep } from "~/server/db/tables/planSteps.table";
import { PlanningAgentActionType } from "~/server/db/enums";

export default {
  title: "Components/Plan",
  component: Plan,
} as Meta;

const Template: Story = (args) => <Plan {...args} />;

const mockPlanSteps: PlanStep[] = [
  {
    id: 1,
    projectId: 123,
    issueNumber: 456,
    type: PlanningAgentActionType.EditExistingCode,
    title: "Update README.md",
    filePath: "README.md",
    instructions: "Add installation instructions.",
    exitCriteria: "README.md updated with installation instructions.",
    dependencies: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    projectId: 123,
    issueNumber: 456,
    type: PlanningAgentActionType.CreateNewCode,
    title: "Create CONTRIBUTING.md",
    filePath: "CONTRIBUTING.md",
    instructions: "Provide guidelines for contributing to the project.",
    exitCriteria: "CONTRIBUTING.md created with contribution guidelines.",
    dependencies: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockAllFiles: string[] = [
  "README.md",
  "src/index.tsx",
  "package.json",
  "tsconfig.json",
];

export const EmptyPlan = Template.bind({});
EmptyPlan.args = {
  projectId: 123,
  issueNumber: 456,
  planSteps: [],
  allFiles: mockAllFiles,
};

export const PopulatedPlan = Template.bind({});
PopulatedPlan.args = {
  projectId: 123,
  issueNumber: 456,
  planSteps: mockPlanSteps,
  allFiles: mockAllFiles,
};

export const InteractivePlan: Story = (args) => {
  const [planSteps, setPlanSteps] = React.useState<PlanStep[]>(mockPlanSteps);

  const handleUpdate = () => {
    // Mock update function
  };

  const handleDelete = () => {
    // Mock delete function
  };

  return <Plan {...args} planSteps={planSteps} allFiles={mockAllFiles} />;
};

InteractivePlan.args = {
  projectId: 123,
  issueNumber: 456,
};

InteractivePlan.parameters = {
  actions: { argTypesRegex: "^on.*" },
};

InteractivePlan.storyName = "Plan with Interactions";
