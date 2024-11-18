import { redirect } from "next/navigation";

import IssueWriter from "./IssueWriter";
import { getServerAuthSession } from "~/server/auth";
import { Suspense } from "react";
import { getDashboardUsers } from "~/app/utils";

const dashboardUsers = getDashboardUsers();

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
      <div className="h-full w-full overflow-hidden p-2 sm:p-4 md:p-6">
        <IssueWriter org={org} repo={repo} />
      </div>
    </Suspense>
  );
};

export default IssueWriterPage;
