"use client";

import { SignOutButton } from "~/app/_components/SignOutButton";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCog,
  faPlus,
  faLink,
  faSync,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useState, useEffect } from "react";
import { api } from "~/trpc/react";

interface SettingsProps {
  org: string;
  repo: string;
  userLogin: string;
}

interface JiraBoard {
  id: string;
  name: string;
  type: string;
}

export default function Settings({ org, repo, userLogin }: SettingsProps) {
  const router = useRouter();
  const [jiraBoards, setJiraBoards] = useState<JiraBoard[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<string>("");

  const { data: projectData } = api.projects.getByOrgAndRepo.useQuery({
    org,
    repo,
  });
  const { mutate: syncBoard } = api.jira.syncBoard.useMutation();
  const { data: boards, isLoading: isLoadingBoards } =
    api.jira.getBoards.useQuery();

  useEffect(() => {
    if (boards) {
      setJiraBoards(boards);
    }
  }, [boards]);

  const handleChangeSetup = () => {
    router.push(`/setup/${userLogin}/${org}/${repo}/setup`);
  };

  const handleConnectToJira = () => {
    const projectId = projectData?.id;
    router.push(`/auth/jira?projectId=${projectId}`);
  };

  const handleSyncBoard = () => {
    if (selectedBoard && projectData) {
      syncBoard({
        projectId: projectData.id,
        boardId: selectedBoard,
      });
    }
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
        className="mt-4 inline-flex items-center rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
      >
        <FontAwesomeIcon icon={faPlus} className="mr-2 h-5 w-5" />
        Add New Repo
      </Link>
      <button
        onClick={handleConnectToJira}
        className="mt-4 flex items-center rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
      >
        <FontAwesomeIcon icon={faLink} className="mr-2 h-5 w-5" />
        Connect to Jira
      </button>
      <div className="mt-6">
        <h2 className="mb-2 text-xl font-semibold">Sync Jira Board</h2>
        <select
          value={selectedBoard}
          onChange={(e) => setSelectedBoard(e.target.value)}
          className="mb-2 w-full rounded-md border border-gray-300 p-2"
          disabled={isLoadingBoards}
        >
          <option value="">Select a Jira Board</option>
          {jiraBoards.map((board) => (
            <option key={board.id} value={board.id}>
              {board.name} ({board.type})
            </option>
          ))}
        </select>
        <button
          onClick={handleSyncBoard}
          disabled={!selectedBoard}
          className="flex items-center rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:bg-gray-400"
        >
          <FontAwesomeIcon icon={faSync} className="mr-2 h-5 w-5" />
          Sync Board
        </button>
      </div>
    </div>
  );
}
