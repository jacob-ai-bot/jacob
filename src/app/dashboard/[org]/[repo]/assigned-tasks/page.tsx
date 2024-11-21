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

export default async function LivePageRoute({ params }: PageProps) {
  const { user } = (await getServerAuthSession()) ?? {};
  if (!user?.login || !user.dashboardEnabled) {
    redirect("/");
  }

  const { org, repo } = params;

  return (
    <Suspense>
      <TasksPage org={org} repo={repo} />
    </Suspense>
  );
}
