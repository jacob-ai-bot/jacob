import { redirect } from "next/navigation";

import { api } from "~/trpc/server";
import IssueWriter from "./IssueWriter"; // Updated import
import { getServerAuthSession } from "~/server/auth";

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
  const project = await api.events.getProject({
    org,
    repo,
  });
  return <IssueWriter org={org} repo={repo} project={project} />;
};

export default IssueWriterPage;
