import { z } from "zod";
import { Octokit } from "@octokit/rest";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const githubRouter = createTRPCRouter({
  getRepos: protectedProcedure.input(z.object({}).optional()).query(
    async ({
      ctx: {
        session: { accessToken },
      },
    }) => {
      const octokit = new Octokit({ auth: accessToken });
      const {
        data: { installations },
      } = await octokit.rest.apps.listInstallationsForAuthenticatedUser();
      const repoLists = await Promise.all(
        installations.map(async (installation) => {
          const {
            data: { repositories },
          } = await octokit.rest.apps.listInstallationReposForAuthenticatedUser(
            {
              installation_id: installation.id,
            },
          );
          return repositories.map(({ id, node_id, full_name }) => ({
            id,
            node_id,
            full_name,
          }));
        }),
      );
      return repoLists.flat();
    },
  ),
});
