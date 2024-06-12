import { redirect } from "next/navigation";

import DevelopersGrid from "./[developer]/components/developers";
import { SignOutButton } from "~/app/_components/SignOutButton";
import { getServerAuthSession } from "~/server/auth";

const dashboardUsers = (process.env.DASHBOARD_USERS ?? "")
  .toLowerCase()
  .split(",");

const RepoPage = async ({
  params,
}: {
  params: { org: string; repo: string };
}) => {
  const { user } = (await getServerAuthSession()) ?? {};
  if (!user?.login || !dashboardUsers.includes(user.login.toLowerCase())) {
    redirect("/");
  }

  return (
    <div className="flex flex-col">
      <div className="m-3 flex flex-row justify-end">
        <SignOutButton callbackUrl="/" />
      </div>
      <DevelopersGrid org={params.org} repo={params.repo} />
    </div>
  );
};

export default RepoPage;
