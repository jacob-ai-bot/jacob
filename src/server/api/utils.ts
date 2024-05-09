import { Octokit } from "@octokit/rest";

export const getAllRepos = async (accessToken: string) => {
  const octokit = new Octokit({ auth: accessToken });
  const {
    data: { installations },
  } = await octokit.rest.apps.listInstallationsForAuthenticatedUser();
  const repoLists = await Promise.all(
    installations.map(async (installation) => {
      const {
        data: { repositories },
      } = await octokit.rest.apps.listInstallationReposForAuthenticatedUser({
        installation_id: installation.id,
      });
      return repositories.map(({ id, node_id, full_name }) => ({
        id,
        node_id,
        full_name,
      }));
    }),
  );
  return repoLists.flat();
};

export const validateRepo = async (
  org: string,
  repo: string,
  accessToken: string,
) => {
  const repositories = await getAllRepos(accessToken);
  const repos = repositories.map((r) => r.full_name);
  if (!repos.includes(`${org}/${repo}`)) {
    throw new Error("Invalid repo");
  }
};
