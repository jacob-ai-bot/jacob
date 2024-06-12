import { redirect } from "next/navigation";

import { api } from "~/trpc/server";
import Dashboard from "./Dashboard";
import { getServerAuthSession } from "~/server/auth";

const dashboardUsers = (process.env.DASHBOARD_USERS ?? "")
  .toLowerCase()
  .split(",");

const DashboardPage = async ({
  params,
}: {
  params: { org: string; repo: string; developer: string };
}) => {
  const { user } = (await getServerAuthSession()) ?? {};
  if (!user?.login || !dashboardUsers.includes(user.login.toLowerCase())) {
    redirect("/");
  }

  const { org, repo, developer } = params;
  const tasks = await api.events.getTasks({
    org,
    repo,
  });

  return (
    <Dashboard org={org} repo={repo} developer={developer} tasks={tasks} />
  );
};

export default DashboardPage;
