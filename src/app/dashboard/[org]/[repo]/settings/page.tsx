import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import { Suspense } from "react";
import Settings from "./Settings";
import { api } from "~/trpc/server";
import LoadingPage from "~/app/dashboard/loading";

interface PageProps {
  params: {
    org: string;
    repo: string;
  };
}

export default async function SettingsPage({ params }: PageProps) {
  const { user } = (await getServerAuthSession()) ?? {};
  if (!user?.login || !user.dashboardEnabled) {
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
        isTeamAdmin={user.isTeamAdmin ?? false}
      />
    </Suspense>
  );
}
