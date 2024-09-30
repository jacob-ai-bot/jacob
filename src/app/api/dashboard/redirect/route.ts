import { NextResponse } from "next/server";
import { getServerAuthSession } from "~/server/auth";
import { api } from "~/trpc/server";

export async function GET(request: Request) {
  const { user } = (await getServerAuthSession()) ?? {};

  // Extract cookies from the request
  const cookiesHeader = request.headers.get("cookie") ?? "";
  const lastUsedRepoMatch = cookiesHeader.match(/lastUsedRepo=([^;]+)/);
  const lastUsedRepo = lastUsedRepoMatch
    ? decodeURIComponent(lastUsedRepoMatch[1] ?? "")
    : "";

  const dashboardUsers = (process.env.DASHBOARD_USERS ?? "")
    .toLowerCase()
    .split(",");

  // Determine redirect URL based on your logic
  let redirectTo = "";

  if (lastUsedRepo) {
    redirectTo = `/dashboard/${lastUsedRepo}`;
  } else if (
    !user?.login ||
    !dashboardUsers.includes(user.login.toLowerCase())
  ) {
    redirectTo = "/finished";
  } else {
    // Fetch the list of repositories
    const data = await api.github.getRepos();
    if (!data?.length) {
      console.log("No repos found");
      redirectTo = "/setup";
    } else {
      const repos = data.map((d) => d.full_name);
      if (repos[0]) {
        redirectTo = `/dashboard/${repos[0]}`;
      } else {
        console.error("No repos found after mapping");
        return NextResponse.json({ error: "No repos found" }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ redirectTo: encodeURIComponent(redirectTo) });
}
