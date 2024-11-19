import { executeWithLogRequiringSuccess, type BaseEventData } from "../utils";
import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

export interface SetNewBranchParams extends BaseEventData {
  rootPath: string;
  branchName: string;
}

async function generateDescriptiveBranchName(
  branchName: string,
): Promise<string> {
  try {
    const response = await openai.createCompletion({
      model: "gpt-3.5-turbo-instruct",
      prompt: `Generate a short, descriptive git branch name (max 3-4 words) based on: ${branchName}. Use only lowercase letters, numbers and dashes. No special characters or spaces.`,
      max_tokens: 20,
      temperature: 0.3,
    });

    let generatedName =
      response.data.choices[0]?.text?.trim().toLowerCase() || branchName;
    generatedName = generatedName.replace(/[^a-z0-9-]/g, "-");
    generatedName = generatedName.replace(/-+/g, "-");
    generatedName = generatedName.replace(/^-|-$/g, "");

    const randomSuffix = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, "0");
    return `${generatedName}-${randomSuffix}`;
  } catch (error) {
    console.error("Error generating descriptive branch name:", error);
    return branchName;
  }
}

export async function setNewBranch({
  rootPath,
  branchName,
  ...baseEventData
}: SetNewBranchParams) {
  const descriptiveBranchName = await generateDescriptiveBranchName(branchName);

  const currentBranch = (
    await executeWithLogRequiringSuccess({
      ...baseEventData,
      directory: rootPath,
      command: "git rev-parse --abbrev-ref HEAD",
    })
  ).stdout
    .toString()
    .trim();
  if (currentBranch === descriptiveBranchName) {
    console.log("Already on branch: ", descriptiveBranchName);
    return;
  }

  const branches = (
    await executeWithLogRequiringSuccess({
      ...baseEventData,
      directory: rootPath,
      command: "git branch",
    })
  ).stdout
    .toString()
    .trim();
  if (branches.includes(descriptiveBranchName)) {
    console.log("Branch already exists: ", descriptiveBranchName);
    return executeWithLogRequiringSuccess({
      ...baseEventData,
      directory: rootPath,
      command: `git checkout ${descriptiveBranchName}`,
    });
  }

  return executeWithLogRequiringSuccess({
    ...baseEventData,
    directory: rootPath,
    command: `git checkout -b ${descriptiveBranchName}`,
  });
}

export interface CheckoutCommitParams extends BaseEventData {
  rootPath: string;
  commit: string;
}

export function checkoutCommit({
  rootPath,
  commit,
  ...baseEventData
}: CheckoutCommitParams) {
  return executeWithLogRequiringSuccess({
    ...baseEventData,
    directory: rootPath,
    command: `git checkout ${commit}`,
  });
}
