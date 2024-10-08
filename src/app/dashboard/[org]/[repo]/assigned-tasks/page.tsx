import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";

import TasksPage from "./TasksPage";
import { Suspense } from "react";
interface PageProps {
  params: {
    org: string;
    repo: string;
  };
}

const dashboardUsers = (process.env.DASHBOARD_USERS ?? "")
  .toLowerCase()
  .split(",");
export default async function LivePageRoute({ params }: PageProps) {
  const { user } = (await getServerAuthSession()) ?? {};
  if (!user?.login || !dashboardUsers.includes(user.login.toLowerCase())) {
    redirect("/");
  }

  const { org, repo } = params;

  return (
    <Suspense>
      <TasksPage org={org} repo={repo} />
    </Suspense>
  );
}
