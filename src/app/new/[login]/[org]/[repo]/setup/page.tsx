import { redirect } from "next/navigation";

import { api } from "~/trpc/server";
import { getServerAuthSession } from "~/server/auth";
import Setup from "./Setup";

const dashboardUsers = (process.env.DASHBOARD_USERS ?? "")
  .toLowerCase()
  .split(",");

const SetupPage = async ({
  params,
}: {
  params: { org: string; repo: string; developer: string };
}) => {
  const { user } = (await getServerAuthSession()) ?? {};
  if (!user?.login || !dashboardUsers.includes(user.login.toLowerCase())) {
    redirect("/");
  }

  // Generate the codebase context, this will add it to the queue
  await api.codebaseContext.generateCodebaseContext({
    org: params.org,
    repoName: params.repo,
  });

  return <Setup org={params.org} repo={params.repo} />;
};

export default SetupPage;
