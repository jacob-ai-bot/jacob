import { Octokit } from "@octokit/rest";
import { Repository } from "@octokit/webhooks-types";

export async function getFile(
  repository: Pick<Repository, "owner" | "name">,
  token: string,
  path: string,
) {
  const octokit = new Octokit({
    auth: token,
    log: console,
    userAgent: "jacob",
  });

  return octokit.repos.getContent({
    owner: repository.owner.login,
    repo: repository.name,
    path,
  });
}
