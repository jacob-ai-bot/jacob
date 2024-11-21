import { Octokit } from "@octokit/rest";
import type { Repository } from "@octokit/webhooks-types";

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

  console.log("Getting file from GitHub...", path);
  return octokit.repos.getContent({
    owner: repository.owner.login,
    repo: repository.name,
    path,
  });
}

export async function getRepositoryLogins(
  org: string,
  repo: string,
  token: string,
) {
  try {
    const octokit = new Octokit({
      auth: token,
      log: console,
      userAgent: "jacob",
    });
    // Fetch direct collaborators
    const { data: collaborators } = await octokit.repos.listCollaborators({
      owner: org,
      repo,
      affiliation: "all",
    });

    const collaboratorLogins = collaborators.map((c: any) => c.login);

    // Fetch teams with access to the repo
    const { data: teams } = await octokit.repos.listTeams({
      owner: org,
      repo,
    });

    const teamMembers = await Promise.all(
      teams.map(async (team: any) => {
        const { data: members } = await octokit.teams.listMembersInOrg({
          org,
          team_slug: team.slug,
        });
        return members.map((m: any) => m.login);
      }),
    );

    const teamMemberLogins = teamMembers.flat();

    // Combine and deduplicate
    const uniqueLogins = new Set([...collaboratorLogins, ...teamMemberLogins]);

    return Array.from(uniqueLogins);
  } catch (error) {
    console.error("Error getting repository logins:", error);
    return [];
  }
}
