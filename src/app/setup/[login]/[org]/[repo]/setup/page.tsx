import { redirect } from "next/navigation";

import { api } from "~/trpc/server";
import { getServerAuthSession } from "~/server/auth";
import Setup from "./Setup";
import { getDashboardUsers } from "~/app/utils";

const dashboardUsers = getDashboardUsers();

const SetupPage = async ({
  params,
}: {
  params: { org: string; repo: string; developer: string };
}) => {
  const { user } = (await getServerAuthSession()) ?? {};
  if (!user?.login || !dashboardUsers.includes(user.login.toLowerCase())) {
    redirect("/");
  }

  await api.codebaseContext.generateCodebaseContext({
    org: params.org,
    repoName: params.repo,
  });
  console.log("Codebase context request generated");
  const settings = await api.onboarding.analyzeProjectForSettings({
    org: params.org,
    repoName: params.repo,
  });
  console.log("Project settings analyzed");

  return <Setup org={params.org} repo={params.repo} settings={settings} />;
};

export default SetupPage;
