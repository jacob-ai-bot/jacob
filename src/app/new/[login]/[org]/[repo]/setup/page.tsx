import { redirect } from "next/navigation";

// import { api } from "~/trpc/server";
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

  return <Setup />;
};

export default SetupPage;
