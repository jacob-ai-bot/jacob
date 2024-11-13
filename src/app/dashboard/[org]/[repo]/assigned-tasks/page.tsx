import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";

import TasksPage from "./TasksPage";
import { Suspense } from "react";
import { getDashboardUsers } from "~/app/utils";
interface PageProps {
  params: {
    org: string;
    repo: string;
  };
}

const dashboardUsers = getDashboardUsers();
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
