import { redirect } from "next/navigation";

import IssueWriter from "./IssueWriter";
import { getServerAuthSession } from "~/server/auth";
import { Suspense } from "react";

const dashboardUsers = (process.env.DASHBOARD_USERS ?? "")
  .toLowerCase()
  .split(",");

const IssueWriterPage = async ({
  params,
}: {
  params: { org: string; repo: string };
}) => {
  const { user } = (await getServerAuthSession()) ?? {};
  if (!user?.login || !dashboardUsers.includes(user.login.toLowerCase())) {
    redirect("/");
  }

  const { org, repo } = params;

  return (
    <Suspense>
      <IssueWriter org={org} repo={repo} />
    </Suspense>
  );
};

export default IssueWriterPage;
