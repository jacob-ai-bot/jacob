"use server";

import { cookies } from "next/headers";

export async function getLastUsedRepoCookie() {
  const lastUsedRepo = cookies().get("lastUsedRepo")?.value;
  return lastUsedRepo;
}

export async function getIsLastUsedRepoCookie(org: string, repo: string) {
  const lastUsedRepo = await getLastUsedRepoCookie();
  return lastUsedRepo === `${org}/${repo}`;
}

export async function setLastUsedRepoCookie(org: string, repo: string) {
  cookies().set("lastUsedRepo", `${org}/${repo}`);
}

export async function setHasStartedCodebaseGenerationCookie(
  org: string,
  repo: string,
  branch = "main",
  commitHash = "",
  value = true,
) {
  if (value) {
    cookies().set(
      `hasStartedCodebaseGeneration-${org}-${repo}-${branch}-${commitHash}  `,
      "true",
    );
  } else {
    cookies().delete(
      `hasStartedCodebaseGeneration-${org}-${repo}-${branch}-${commitHash}`,
    );
  }
}

export async function getHasStartedCodebaseGenerationCookie(
  org: string,
  repo: string,
  branch = "main",
  commitHash = "",
) {
  const hasStarted = cookies().get(
    `hasStartedCodebaseGeneration-${org}-${repo}-${branch}-${commitHash}`,
  )?.value;
  return hasStarted ? true : false;
}
