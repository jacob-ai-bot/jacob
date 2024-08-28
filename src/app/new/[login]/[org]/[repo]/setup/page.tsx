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

  const [, settings] = await Promise.all([
    api.codebaseContext.generateCodebaseContext({
      org: params.org,
      repoName: params.repo,
    }),
    api.onboarding.analyzeProjectForSettings({
      org: params.org,
      repoName: params.repo,
    }),
  ]);

  return <Setup org={params.org} repo={params.repo} settings={settings} />;
};

export default SetupPage;
