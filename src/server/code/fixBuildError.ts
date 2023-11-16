import { Issue, Repository } from "@octokit/webhooks-types";
import { Endpoints } from "@octokit/types";

import { assessBuildError } from "./assessBuildError";
import { runNpmInstall } from "../build/node/check";
import { checkAndCommit } from "./checkAndCommit";
import { addCommentToIssue } from "../github/issue";

type PullRequest =
  Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}"]["response"]["data"];

export async function fixBuildError(
  repository: Repository,
  token: string,
  issue: Issue | null,
  body: string | null,
  rootPath: string,
  branch: string,
  existingPr: PullRequest,
) {
  const buildErrorSection = (body?.split("## Error Message:\n\n") ?? [])[1];
  const buildError = (buildErrorSection ?? "").split("## ")[0];

  const assessment = await assessBuildError(buildError);
  console.log("Assessment of Error:", assessment);

  if (assessment.needsNpmInstall && assessment.npmPackageToInstall) {
    console.log("Needs npm install");

    await runNpmInstall(rootPath, assessment.npmPackageToInstall.trim());

    await checkAndCommit({
      repository,
      token: token,
      rootPath,
      branch,
      commitMessage: "Otto commit: fix build error",
      existingPr,
    });
  } else if (issue) {
    const message = `Otto here once again...\n\n
  Unfortunately, I wasn't able to resolve this build error.\n\n
  Here is some information about the error:\n\n${assessment.causeOfError}\n\n
  Here are some ideas for fixing the error:\n\n${assessment.ideasForFixingError}\n\n
  Here is the suggested fix:\n\n${assessment.suggestedFix}\n`;

    await addCommentToIssue(repository, issue.number, token, message);
  }
}
