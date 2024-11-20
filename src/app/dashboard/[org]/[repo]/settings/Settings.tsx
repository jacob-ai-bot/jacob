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
import { type JiraBoard, type LinearTeam } from "~/types";
import { toast } from "react-toastify";

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
  jiraCloudId: initialJiraCloudId,
}: SettingsProps) {
  const router = useRouter();
  const [jiraBoards, setJiraBoards] = useState<JiraBoard[]>([]);
  const [selectedJiraBoard, setSelectedJiraBoard] = useState<string>("");
  const [jiraCloudIdState, setJiraCloudIdState] = useState<string | undefined>(
    initialJiraCloudId,
  );
  const [linearTeams, setLinearTeams] = useState<LinearTeam[]>([]);
  const [selectedLinearTeam, setSelectedLinearTeam] = useState<string>("");

  const { mutate: syncJiraBoard, isPending: isSyncingJiraBoard } =
    api.jira.syncBoard.useMutation({
      onSuccess: () => {
        toast.success("Jira board synced");
      },
      onError: (error) => {
        toast.error("Error syncing Jira board");
        console.error("Error syncing Jira board:", error);
      },
    });

  const { mutate: syncLinearTeam, isPending: isSyncingLinearTeam } =
    api.linear.syncTeam.useMutation({
      onSuccess: () => {
        toast.success("Linear team synced");
      },
      onError: (error) => {
        toast.error("Error syncing Linear team");
        console.error("Error syncing Linear team:", error);
      },
    });

  const {
    data: isUserConnectedToJira,
    isLoading: isLoadingIsUserConnectedToJira,
    error: isUserConnectedToJiraError,
  } = api.jira.isUserConnectedToJira.useQuery();

  const {
    data: isUserConnectedToLinear,
    isLoading: isLoadingIsUserConnectedToLinear,
    error: isUserConnectedToLinearError,
  } = api.linear.isUserConnectedToLinear.useQuery();

  const { data: jiraCloudIdResources, error: jiraCloudIdResourcesError } =
    api.jira.getJiraCloudIdResources.useQuery();

  const {
    data: boards,
    isLoading: isLoadingJiraBoards,
    refetch: refetchJiraBoards,
  } = api.jira.getBoards.useQuery(
    { jiraCloudId: jiraCloudIdState },
    {
      enabled: !!jiraCloudIdState,
    },
  );

  const {
    data: teams,
    isLoading: isLoadingLinearTeams,
    refetch: refetchLinearTeams,
  } = api.linear.getTeams.useQuery();

  const { mutate: saveJiraCloudId } = api.jira.saveJiraCloudId.useMutation({
    onSuccess: (savedJiraCloudId) => {
      if (typeof savedJiraCloudId === "string") {
        setJiraCloudIdState(savedJiraCloudId);
        void refetchJiraBoards();
      } else {
        console.error(
          "Unexpected response from saveJiraCloudId:",
          savedJiraCloudId,
        );
      }
    },
    onError: (error) => {
      toast.error("Error saving Jira cloud ID");
      console.error("Error saving Jira cloud ID:", error);
    },
  });

  const { mutate: saveLinearProjectId } =
    api.linear.saveLinearProjectId.useMutation({
      onSuccess: () => {
        toast.success("Linear project saved");
        void refetchLinearTeams();
      },
      onError: (error) => {
        toast.error("Error saving Linear project");
        console.error("Error saving Linear project:", error);
      },
    });

  useEffect(() => {
    if (boards) {
      setJiraBoards(boards);
      if (boards.length === 0) {
        toast.info("No Jira boards found for this cloud ID");
      } else if (boards[0]) {
        setSelectedJiraBoard(boards[0].id);
      }
    }
  }, [boards]);

  useEffect(() => {
    if (teams) {
      setLinearTeams(teams);
      if (teams.length === 0) {
        toast.info("No Linear projects found");
      } else if (teams[0]) {
        setSelectedLinearTeam(teams[0].id);
      }
    }
  }, [teams]);

  const handleChangeSetup = () => {
    router.push(`/setup/${userLogin}/${org}/${repo}/setup`);
  };

  const handleConnectToJira = () => {
    router.push(`/auth/jira?projectId=${projectId}`);
  };

  const handleConnectToLinear = () => {
    router.push(`/auth/linear?projectId=${projectId}`);
  };

  const handleSyncJiraBoard = () => {
    if (selectedJiraBoard && jiraCloudIdState && projectId) {
      syncJiraBoard({
        projectId,
        jiraCloudId: jiraCloudIdState,
        boardId: selectedJiraBoard,
      });
    }
  };

  const handleSyncLinearTeam = () => {
    if (selectedLinearTeam && projectId) {
      syncLinearTeam({
        projectId,
        teamId: selectedLinearTeam,
      });
    }
  };

  return (
    <div className="relative h-full w-full text-left dark:bg-slate-900 dark:text-white">
      <div className="mx-auto w-full max-w-lg rounded-lg bg-aurora-100/50 p-8 dark:bg-slate-800/50">
        <div className="absolute right-4 top-4">
          <SignOutButton callbackUrl="/" />
        </div>
        <h1 className="mb-4 text-2xl font-bold dark:text-white">Settings</h1>
        <button
          onClick={handleChangeSetup}
          className="mt-6 flex items-center rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-400"
          aria-label="Change Setup"
        >
          <FontAwesomeIcon icon={faCog} className="mr-2" />
          Change Setup
        </button>
        <Link
          href={`/setup/${org}`}
          className="mt-4 inline-flex items-center rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-400"
        >
          <FontAwesomeIcon icon={faPlus} className="mr-2 h-5 w-5" />
          Add New Repo
        </Link>
        {!isUserConnectedToJira && !isLoadingIsUserConnectedToJira && (
          <button
            onClick={handleConnectToJira}
            className="mt-4 flex items-center rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 dark:bg-purple-600 dark:hover:bg-purple-700 dark:focus:ring-purple-400"
          >
            <FontAwesomeIcon icon={faLink} className="mr-2 h-5 w-5" />
            Connect to Jira
          </button>
        )}
        {!isUserConnectedToLinear && !isLoadingIsUserConnectedToLinear && (
          <button
            onClick={handleConnectToLinear}
            className="mt-4 flex items-center rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 dark:bg-indigo-600 dark:hover:bg-indigo-700 dark:focus:ring-indigo-400"
          >
            <FontAwesomeIcon icon={faLink} className="mr-2 h-5 w-5" />
            Connect to Linear
          </button>
        )}
        {isUserConnectedToJira &&
          !jiraCloudIdState &&
          !isLoadingIsUserConnectedToJira && (
            <div className="mt-6">
              <h2 className="mb-4 text-xl font-semibold dark:text-white">
                Choose a Jira Cloud ID
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {jiraCloudIdResources?.map((resource) => (
                  <button
                    key={resource.id}
                    onClick={() =>
                      saveJiraCloudId({ jiraCloudId: resource.id, projectId })
                    }
                    className="group relative flex flex-col items-start rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-blue-500 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-400"
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
          jiraCloudIdState &&
          !isLoadingIsUserConnectedToJira && (
            <div className="mt-6">
              <h2 className="mb-2 text-xl font-semibold dark:text-white">
                Sync Jira Board
              </h2>
              <select
                value={selectedJiraBoard}
                onChange={(e) => setSelectedJiraBoard(e.target.value)}
                className="mb-2 inline-block w-full max-w-lg rounded-md border border-gray-300 p-2 text-sm shadow-sm backdrop-blur-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-300"
                disabled={isLoadingJiraBoards}
              >
                <option value="">Select a Jira Board</option>
                {jiraBoards?.map((board) => (
                  <option key={board.id} value={board.id}>
                    {board.name} ({board.key})
                  </option>
                ))}
              </select>
              <button
                onClick={handleSyncJiraBoard}
                disabled={!selectedJiraBoard || isSyncingJiraBoard}
                className="flex items-center rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:bg-gray-400 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-400 dark:disabled:bg-gray-600"
              >
                <FontAwesomeIcon icon={faSync} className="mr-2 h-5 w-5" />
                {isSyncingJiraBoard ? "Syncing..." : "Sync Jira Board"}
              </button>
            </div>
          )}
        {isUserConnectedToLinear && !isLoadingIsUserConnectedToLinear && (
          <div className="mt-6">
            <h2 className="mb-2 text-xl font-semibold dark:text-white">
              Sync Linear Team
            </h2>
            <select
              value={selectedLinearTeam}
              onChange={(e) => {
                setSelectedLinearTeam(e.target.value);
                saveLinearProjectId({
                  linearTeamId: e.target.value,
                  projectId,
                });
              }}
              className="mb-2 inline-block w-full max-w-lg rounded-md border border-gray-300 p-2 text-sm shadow-sm backdrop-blur-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-300"
              disabled={isLoadingLinearTeams}
            >
              <option value="">Select a Linear Team</option>
              {linearTeams?.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
            {selectedLinearTeam && (
              <button
                onClick={handleSyncLinearTeam}
                disabled={!selectedLinearTeam || isSyncingLinearTeam}
                className="flex items-center rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 disabled:bg-gray-400 dark:bg-indigo-600 dark:hover:bg-indigo-700 dark:focus:ring-indigo-400 dark:disabled:bg-gray-600"
              >
                <FontAwesomeIcon icon={faSync} className="mr-2 h-5 w-5" />
                {isSyncingLinearTeam ? "Syncing..." : "Sync Linear Team"}
              </button>
            )}
          </div>
        )}
        {isLoadingIsUserConnectedToJira && (
          <div className="dark:text-gray-300">Loading Jira Settings...</div>
        )}
        {isLoadingIsUserConnectedToLinear && (
          <div className="dark:text-gray-300">Loading Linear Settings...</div>
        )}
        {isUserConnectedToJiraError && (
          <div className="text-red-600 dark:text-red-400">
            Error loading Jira settings: {isUserConnectedToJiraError.message}
          </div>
        )}
        {isUserConnectedToLinearError && (
          <div className="text-red-600 dark:text-red-400">
            Error loading Linear settings:{" "}
            {isUserConnectedToLinearError.message}
          </div>
        )}
        {jiraCloudIdResourcesError && (
          <div className="text-red-600 dark:text-red-400">
            Error loading Jira cloud ID resources:{" "}
            {jiraCloudIdResourcesError.message}
          </div>
        )}
      </div>
    </div>
  );
}
