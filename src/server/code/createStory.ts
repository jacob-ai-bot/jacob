import { Repository } from "@octokit/webhooks-types";
import { Endpoints } from "@octokit/types";
import dedent from "ts-dedent";
import fs from "fs";
import path from "path";

import { getTypes } from "../analyze/sourceMap";
import { checkAndCommit } from "./checkAndCommit";
import { getIssue } from "../github/issue";
import {
  extractFilePathWithArrow,
  parseTemplate,
  todayAsString,
} from "../utils";
import { sendGptRequest } from "../openai/request";

type PullRequest =
  Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}"]["response"]["data"];

const exampleStory = dedent`
  // The code for the Button component:
  // import React from "react";
  
  // interface ButtonProps {
  //   primary?: boolean;
  //   backgroundColor?: string;
  //   size?: "small" | "medium" | "large";
  //   label: string;
  //   onClick?: () => void;
  // }
  
  // const Button: React.FC<ButtonProps> = ({
  //   primary = false,
  //   backgroundColor,
  //   size = "medium",
  //   label,
  //   ...props
  // }) => {
  //   const mode = primary
  //     ? "storybook-button--primary"
  //     : "storybook-button--secondary";
  //   return (
  //     <button
  //       type="button"
  //       className={[
  //         "storybook-button",
  //         \`storybook-button--\${size}\`,
  //         mode,
  //       ].join(" ")}
  //       style={{ backgroundColor }}
  //       {...props}
  //     >
  //       {label}
  //     </button>
  //   );
  // };
  
  // export default Button;
  
  // The full story starts here:
  import type { Meta, StoryObj } from "@storybook/react";
  
  import Button from "~/components/Button"
  
  const mockPrimary:any = {
      primary: true,
      label: "Button",
  };
  
  const mockSecondary:any = {
      label: "Button",
  };
  
  const mockLarge:any = {
      size: "large",
      label: "Button",
  };
  
  const mockSmall:any = {
      size: "small",
      label: "Button",
  };
  
  const mockWarning:any = {
      primary: true,
      label: "Delete now",
      backgroundColor: "red",
  };
  
  const meta = {
    title: "Components/Button",
    component: Button,
    parameters: {
      layout: "centered",
    },
    tags: ["autodocs"],
    argTypes: {
      backgroundColor: { control: "color" },
    },
  } satisfies Meta<typeof Button>;
  
  export default meta;
  type Story = StoryObj<typeof meta>;
  
  export const Primary: Story = {
    args: mockPrimary,
  };
  
  export const Secondary: Story = {
    args: mockSecondary,
  };
  
  export const Large: Story = {
    args: mockLarge,
  };
  
  export const Small: Story = {
    args: mockSmall,
  };
  
  export const Warning: Story = {
    args: mockWarning,
  };
`;

export async function createStory(
  repository: Repository,
  token: string,
  rootPath: string,
  branch: string,
  existingPr: PullRequest,
) {
  const regex = /otto-issue-(\d+)-.*/;
  const match = branch.match(regex);
  const issueNumber = parseInt(match?.[1] ?? "", 10);
  const result = await getIssue(repository, token, issueNumber);
  console.log(
    `Loaded Issue #${issueNumber} associated with PR #${existingPr?.number}`,
  );
  const issue = result.data;

  const newFileName = extractFilePathWithArrow(issue.title);
  if (!newFileName) {
    throw new Error(
      "createStory: Unable to extract file name from issue title",
    );
  }
  const storybookFilename = newFileName.replace(".tsx", ".stories.tsx");
  const componentCode = fs.readFileSync(
    path.join(rootPath, newFileName),
    "utf8",
  );
  const types = getTypes(rootPath);

  const storyTemplateParams = {
    newFileName,
    storybookFilename,
    types,
    exampleStory,
    componentCode,
    todayAsString: todayAsString(),
  };

  const planSystemPrompt = parseTemplate(
    "dev",
    "create_story",
    "system",
    storyTemplateParams,
  );
  const planUserPrompt = parseTemplate(
    "dev",
    "create_story",
    "user",
    storyTemplateParams,
  );
  const storybookCode = (await sendGptRequest(
    planUserPrompt,
    planSystemPrompt,
    0.2,
  )) as string;

  const targetPath = path.join(rootPath, storybookFilename);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, storybookCode);

  await checkAndCommit({
    repository,
    token,
    rootPath,
    branch,
    commitMessage: `Otto commit: add storybook story ${storybookFilename}`,
    existingPr,
    creatingStory: true,
  });
}
