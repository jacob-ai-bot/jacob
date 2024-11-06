import { NextResponse } from "next/server";
import { setLastUsedRepoCookie } from "~/app/actions";
import { getServerAuthSession } from "~/server/auth";
import { refreshGitHubAccessToken } from "~/server/github/tokens";
import { api } from "~/trpc/server";

export async function GET(request: Request) {
  const { user } = (await getServerAuthSession()) ?? {};

  // Refresh the access token if the token is expired
  if (user?.expires && Date.parse(user.expires) < Date.now()) {
    const userId = parseInt(user.id);
    await refreshGitHubAccessToken(userId);
  }

  const { searchParams } = new URL(request.url);
  const org = searchParams.get("org");
  const repo = searchParams.get("repo");
  const page = searchParams.get("page");

  if (org && repo && user?.login) {
    await setLastUsedRepoCookie(org, repo);
    return NextResponse.redirect(
      new URL(
        `/dashboard/${org}/${repo}/${page ?? "code-visualizer"}`,
        process.env.NEXTAUTH_URL,
      ),
    );
  }

  // Extract cookies from the request
  const cookiesHeader = request.headers.get("cookie") ?? "";
  const lastUsedRepoMatch = cookiesHeader.match(/lastUsedRepo=([^;]+)/);
  const lastUsedRepo = lastUsedRepoMatch
    ? decodeURIComponent(lastUsedRepoMatch[1] ?? "")
    : "";

  // Determine redirect URL based on your logic
  let redirectTo = "";

  if (lastUsedRepo) {
    redirectTo = `/dashboard/${lastUsedRepo}/${page ?? "code-visualizer"}`;
  } else if (
    !user?.login ||
    (user?.expires && Date.parse(user.expires) < Date.now())
  ) {
    redirectTo = "/";
  } else {
    // Fetch the list of repositories
    const data = await api.github.getRepos();
    if (!data?.length) {
      console.log("No repos found");
      redirectTo = "/setup";
    } else {
      const repos = data.map((d) => d.full_name);
      if (repos[0]) {
        redirectTo = `/dashboard/${repos[0]}/${page ?? "code-visualizer"}`;
      } else {
        console.error("No repos found after mapping");
        return NextResponse.redirect(
          new URL("/setup", process.env.NEXTAUTH_URL),
        );
      }
    }
  }

  return NextResponse.redirect(new URL(redirectTo, process.env.NEXTAUTH_URL));
}
