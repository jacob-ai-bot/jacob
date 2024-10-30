import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import { Suspense } from "react";
import { SignOutButton } from "~/app/_components/SignOutButton";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSignOutAlt, faCog } from "@fortawesome/free-solid-svg-icons";

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
      <div className="relative h-full w-full text-left">
        <div className="absolute right-4 top-4">
          <SignOutButton callbackUrl="/auth/signin" />
        </div>
        <h1 className="mb-4 text-2xl font-bold">Settings</h1>
        <p>Add settings here</p>
        <ChangeSetupButton org={org} repo={repo} userLogin={user.login} />
      </div>
    </Suspense>
  );
}

function ChangeSetupButton({
  org,
  repo,
  userLogin,
}: {
  org: string;
  repo: string;
  userLogin: string;
}) {
  const router = useRouter();

  const handleChangeSetup = () => {
    router.push(`/setup/${userLogin}/${org}/${repo}/setup`);
  };

  return (
    <button
      onClick={handleChangeSetup}
      className="mt-6 flex items-center rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
      aria-label="Change Setup"
    >
      <FontAwesomeIcon icon={faCog} className="mr-2" />
      Change Setup
    </button>
  );
}
