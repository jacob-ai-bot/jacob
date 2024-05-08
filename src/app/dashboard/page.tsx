import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { api } from "~/trpc/server";

const DashboardPage = async () => {
  const cookieStore = cookies();
  const lastUsedRepo = cookieStore.get("lastUsedRepo");

  // Redirect to the last used repo if available
  if (lastUsedRepo?.value) {
    redirect(`/dashboard/${lastUsedRepo.value}`);
  }

  // Fetch the list of repositories
  const data = await api.github.getRepos();
  if (!data?.length) {
    console.log("No repos found");
    // Redirect to home if no repos are available
    redirect("/");
  }

  console.log("data", data);
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
