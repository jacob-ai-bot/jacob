"use client";

import { SignOutButton } from "~/app/_components/SignOutButton";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog, faPlus } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";

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
      <Link
        href={`/setup/${org}`}
        className="mt-4 flex items-center rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
      >
        <FontAwesomeIcon icon={faPlus} className="mr-2 h-5 w-5" />
        Add New Repo
      </Link>
    </div>
  );
}
