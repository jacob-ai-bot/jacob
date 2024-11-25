import { redirect } from "next/navigation";

import { getServerAuthSession } from "~/server/auth";
import { Suspense } from "react";
import Overview from "./Overview";

const OverviewPage = async ({
  params,
}: {
  params: { org: string; repo: string };
}) => {
  const { user } = (await getServerAuthSession()) ?? {};
  if (!user?.login || !user.dashboardEnabled) {
    redirect("/");
  }

  const { org, repo } = params;

  return (
    <Suspense>
      <Overview org={org} repo={repo} />
    </Suspense>
  );
};

export default OverviewPage;
