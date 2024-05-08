import { validateRepo } from "~/server/api/utils";
import Dashboard from "./Dashboard";
import { api } from "~/trpc/server";

const DashboardPage = async ({
  params,
}: {
  params: { org: string; repo: string; developer: string };
}) => {
  const { org, repo, developer } = params;
  // check to ensure the org and repo are valid and the user can access them
  await validateRepo(org, repo);

  return <Dashboard org={org} repo={repo} developer={developer} />;
};

export default DashboardPage;
