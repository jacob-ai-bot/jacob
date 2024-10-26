import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import { Suspense } from "react";

interface PageProps {
  params: {
    org: string;
    repo: string;
  };
}

const dashboardUsers = (process.env.DASHBOARD_USERS ?? "")
  .toLowerCase()
  .split(",");

export default async function SettingsPage({ params }: PageProps) {
  const { user } = (await getServerAuthSession()) ?? {};
  if (!user?.login || !dashboardUsers.includes(user.login.toLowerCase())) {
    redirect("/");
  }

  const { org, repo } = params;
  console.log("org", org);
  console.log("repo", repo);
  return (
    <Suspense>
      <div className="h-full w-full text-left">
        <h1 className="mb-4 text-2xl font-bold">Settings</h1>
        <p>Add settings here</p>
      </div>
    </Suspense>
  );
}
