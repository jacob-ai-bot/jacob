import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getServerAuthSession } from "~/server/auth";
import { api } from "~/trpc/server";

const dashboardUsers = (process.env.DASHBOARD_USERS ?? "")
  .toLowerCase()
  .split(",");

const DashboardPage = async () => {
  const { user } = (await getServerAuthSession()) ?? {};

  const cookieStore = cookies();
  const lastUsedRepo = cookieStore.get("lastUsedRepo");

  // Redirect to the last used repo if available
  if (lastUsedRepo?.value) {
    redirect(`/dashboard/${lastUsedRepo.value}`);
  }

  if (!user?.login || !dashboardUsers.includes(user.login.toLowerCase())) {
    redirect("/finished");
  }

  // Fetch the list of repositories
  const data = await api.github.getRepos();
  if (!data?.length) {
    console.log("No repos found");
    // Redirect to home if no repos are available
    redirect("/setup");
  }

  const repos = data.map((d) => d.full_name);

  if (!repos[0]) {
    console.error("No repos found after mapping");
    throw new Error("No repos found");
  }

  // Redirect to the first repository
  const dashboardUrl = `/dashboard/${repos[0]}`;
  redirect(dashboardUrl);
};

export default DashboardPage;
