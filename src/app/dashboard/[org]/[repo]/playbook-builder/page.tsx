import React from "react";
import { getServerAuthSession } from "~/server/auth";
import { redirect } from "next/navigation";
import PlaybookBuilder from "./PlaybookBuilder";

export default async function PlaybookBuilderPage({
  params,
}: {
  params: { org: string; repo: string };
}) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <div className="h-full w-full">
      <PlaybookBuilder org={params.org} repo={params.repo} />
    </div>
  );
}
