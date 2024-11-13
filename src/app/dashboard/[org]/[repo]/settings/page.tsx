import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import { Suspense } from "react";
import Settings from "./Settings";
import { api } from "~/trpc/server";
import LoadingPage from "~/app/dashboard/loading";
import { getDashboardUsers } from "~/app/utils";

interface PageProps {
  params: {
    org: string;
    repo: string;
  };
}

const dashboardUsers = getDashboardUsers();

export default async function SettingsPage({ params }: PageProps) {
  const { user } = (await getServerAuthSession()) ?? {};
  if (!user?.login || !dashboardUsers.includes(user.login.toLowerCase())) {
    redirect("/");
  }

  const { org, repo } = params;
  const project = await api.projects.getByOrgAndRepo({
    org,
    repo,
  });

  if (!project) {
    redirect("/dashboard");
  }

  const jiraCloudId = project?.jiraCloudId ?? undefined;

  return (
    <Suspense fallback={<LoadingPage />}>
      <Settings
        org={org}
        repo={repo}
        projectId={project.id}
        jiraCloudId={jiraCloudId}
        userLogin={user.login}
      />
    </Suspense>
  );
}
