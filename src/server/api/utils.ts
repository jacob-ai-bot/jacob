import { api } from "~/trpc/server";

export const validateRepo = async (org: string, repo: string) => {
  // Fetch the list of repositories
  const data = await api.github.getRepos();
  if (!data?.length) {
    throw new Error("No repos found");
  }

  const repos = data.map((d) => d.full_name);
  if (!repos.includes(`${org}/${repo}`)) {
    console.error("Invalid org or repo");
    throw new Error("Invalid org or repo");
  }
  return true;
};
