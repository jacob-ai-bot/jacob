"use client";

import { SignOutButton } from "~/app/_components/SignOutButton";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog } from "@fortawesome/free-solid-svg-icons";

interface SettingsProps {
  org: string;
  repo: string;
  userLogin: string;
}

export default function Settings({ org, repo, userLogin }: SettingsProps) {
  const router = useRouter();

  const handleChangeSetup = () => {
    router.push(`/setup/${userLogin}/${org}/${repo}/setup`);
  };

  return (
    <div className="relative h-full w-full text-left">
      <div className="absolute right-4 top-4">
        <SignOutButton callbackUrl="/" />
      </div>
      <h1 className="mb-4 text-2xl font-bold">Settings</h1>
      <button
        onClick={handleChangeSetup}
        className="mt-6 flex items-center rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        aria-label="Change Setup"
      >
        <FontAwesomeIcon icon={faCog} className="mr-2" />
        Change Setup
      </button>
    </div>
  );
}
