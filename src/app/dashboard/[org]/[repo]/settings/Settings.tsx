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
import { type JiraBoard } from "~/types";

interface SettingsProps {
  org: string;
  repo: string;
  projectId: number;
  userLogin: string;
  jiraCloudId?: string | undefined;
}

export default function Settings({
  org,
  repo,
  projectId,
  userLogin,
  jiraCloudId,
}: SettingsProps) {
  const router = useRouter();
  const [jiraBoards, setJiraBoards] = useState<JiraBoard[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<string>("");

  const { mutate: syncBoard } = api.jira.syncBoard.useMutation();
  const {
    data: isUserConnectedToJira,
    isLoading: isLoadingIsUserConnectedToJira,
  } = api.jira.isUserConnectedToJira.useQuery();
  const { data: jiraCloudIdResources } =
    api.jira.getJiraCloudIdResources.useQuery();
  const {
    data: boards,
    isLoading: isLoadingBoards,
    refetch: refetchBoards,
  } = api.jira.getBoards.useQuery({ jiraCloudId });

  const { mutate: saveJiraCloudId } = api.jira.saveJiraCloudId.useMutation({
    onSuccess: () => {
      void refetchBoards();
    },
  });

  useEffect(() => {
    if (boards) {
      setJiraBoards(boards);
    }
  }, [boards]);

  const handleChangeSetup = () => {
    router.push(`/setup/${userLogin}/${org}/${repo}/setup`);
  };

  const handleConnectToJira = () => {
    router.push(`/auth/jira?projectId=${projectId}`);
  };

  const handleSyncBoard = () => {
    if (selectedBoard && jiraCloudId && projectId) {
      syncBoard({
        projectId,
        jiraCloudId,
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
      {!isUserConnectedToJira && !isLoadingIsUserConnectedToJira && (
        <button
          onClick={handleConnectToJira}
          className="mt-4 flex items-center rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
        >
          <FontAwesomeIcon icon={faLink} className="mr-2 h-5 w-5" />
          Connect to Jira
        </button>
      )}
      {isUserConnectedToJira &&
        !jiraCloudId &&
        !isLoadingIsUserConnectedToJira && (
          <div className="mt-6">
            <h2 className="mb-4 text-xl font-semibold">
              Choose a Jira Cloud ID
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {jiraCloudIdResources?.map((resource) => (
                <button
                  key={resource.id}
                  onClick={() =>
                    saveJiraCloudId({ jiraCloudId: resource.id, projectId })
                  }
                  className="group relative flex flex-col items-start rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-blue-500 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                >
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {resource.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {resource.url}
                  </p>
                  <div className="mt-4 flex w-full items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {resource.id}
                    </span>
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      Select
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      {isUserConnectedToJira &&
        jiraCloudId &&
        !isLoadingIsUserConnectedToJira && (
          <div className="mt-6">
            <h2 className="mb-2 text-xl font-semibold">Sync Jira Board</h2>
            <select
              value={selectedBoard}
              onChange={(e) => setSelectedBoard(e.target.value)}
              className="mb-2 inline-block w-full max-w-lg rounded-md border border-gray-300 p-2"
              disabled={isLoadingBoards}
            >
              <option value="">Select a Jira Board</option>
              {jiraBoards.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name} ({board.key})
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
        )}
      {isLoadingIsUserConnectedToJira && <div>Loading Jira Settings...</div>}
    </div>
  );
}
