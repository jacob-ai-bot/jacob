import { Request, Response } from "express";
import { Octokit } from "@octokit/rest";

export async function getRepos(req: Request, res: Response) {
  const { authorization } = req.headers;
  const token: string | undefined = (authorization ?? "").trim().split(" ")[1];

  const octokit = new Octokit({
    auth: token,
  });

  try {
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
    return res.status(200).json(repoLists.flat());
  } catch (error) {
    return res.status(500).json({ errors: [`${error}`] });
  }
}
