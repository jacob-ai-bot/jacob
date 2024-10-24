"use client";

import React, { useState, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRefresh, faPlus } from "@fortawesome/free-solid-svg-icons";
import { SunIcon, MoonIcon } from "@heroicons/react/24/solid";
import { Listbox, Transition } from "@headlessui/react";
import { ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { api } from "~/trpc/react";
import { toast } from "react-toastify";

interface HeaderProps {
  org: string;
  repoName: string;
}

export default function Header({ org, repoName }: HeaderProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>("main");
  const [selectedRepo, setSelectedRepo] = useState<string>(
    `${org}/${repoName}`,
  );

  const {
    data: repos,
    isLoading: isLoadingRepos,
    refetch,
  } = api.github.getRepos.useQuery();

  const refreshContextMutation =
    api.codebaseContext.generateCodebaseContext.useMutation({
      onSuccess: () => {
        console.log("Context refreshed successfully");
      },
      onError: (error) => {
        console.error("Refresh context failed:", error);
      },
    });

  const { data: branches, isLoading: isLoadingBranches } =
    api.github.getBranches.useQuery(
      { org, repo: repoName },
      { enabled: !!org && !!repoName },
    );

  useEffect(() => {
    if (branches && branches.length > 0) {
      setSelectedBranch(branches[0] ?? "main");
    }
  }, [branches]);

  const handleRepoChange = (value: string) => {
    setSelectedRepo(value);
    if (value) {
      router.push(`/dashboard/${value}`);
    }
  };

  const handleBranchChange = (value: string) => {
    setSelectedBranch(value);
    console.log(`Selected branch: ${value}`);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    refreshContextMutation.mutate({
      org,
      repoName,
    });
    void refetch();

    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Codebase context refreshed successfully");
    }, 10000);
  };

  const handleAddNewRepo = () => {
    router.push(`/setup/${org}`);
  };

  return (
    <header className="bg-white/90 pl-[96px] shadow-sm dark:bg-slate-800">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <Listbox value={selectedRepo} onChange={handleRepoChange}>
            <div className="relative mt-1">
              <Listbox.Button className="focus-visible:ring-offset-orange-300 relative w-full cursor-default rounded-lg bg-aurora-50 py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 dark:bg-slate-700 dark:text-slate-100 sm:text-sm">
                <span className="block truncate">{selectedRepo}</span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronUpDownIcon
                    className="h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                </span>
              </Listbox.Button>
              <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-slate-700 sm:text-sm">
                  {isLoadingRepos ? (
                    <Listbox.Option
                      className={({ active }) =>
                        `relative cursor-default select-none py-2 pl-10 pr-4 ${
                          active
                            ? "bg-aurora-100 text-aurora-900"
                            : "text-gray-900"
                        }`
                      }
                      value=""
                    >
                      Loading...
                    </Listbox.Option>
                  ) : (
                    <>
                      {repos?.map((repo) => (
                        <Listbox.Option
                          key={repo.id}
                          className={({ active }) =>
                            `relative cursor-default select-none py-2 pl-10 pr-4 ${
                              active
                                ? "bg-aurora-100 text-aurora-900"
                                : "text-gray-900"
                            }`
                          }
                          value={repo.full_name}
                        >
                          {({ selected }) => (
                            <>
                              <span
                                className={`block truncate ${
                                  selected ? "font-medium" : "font-normal"
                                }`}
                              >
                                {repo.full_name}
                              </span>
                            </>
                          )}
                        </Listbox.Option>
                      ))}
                      <Listbox.Option
                        className={({ active }) =>
                          `relative cursor-default select-none py-2 pl-10 pr-4 ${
                            active
                              ? "bg-aurora-100 text-aurora-900"
                              : "text-gray-900"
                          }`
                        }
                        value="add_new_repo"
                        onClick={handleAddNewRepo}
                      >
                        Add New Repo
                      </Listbox.Option>
                    </>
                  )}
                </Listbox.Options>
              </Transition>
            </div>
          </Listbox>
          <Listbox value={selectedBranch} onChange={handleBranchChange}>
            <div className="relative mt-1">
              <Listbox.Button className="focus-visible:ring-offset-orange-300 relative w-full cursor-default rounded-lg bg-aurora-50 py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 dark:bg-slate-700 dark:text-slate-100 sm:text-sm">
                <span className="block truncate">{selectedBranch}</span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronUpDownIcon
                    className="h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                </span>
              </Listbox.Button>
              <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-slate-700 sm:text-sm">
                  {isLoadingBranches ? (
                    <Listbox.Option
                      className={({ active }) =>
                        `relative cursor-default select-none py-2 pl-10 pr-4 ${
                          active
                            ? "bg-aurora-100 text-aurora-900"
                            : "text-gray-900"
                        }`
                      }
                      value=""
                    >
                      Loading branches...
                    </Listbox.Option>
                  ) : (
                    branches?.map((branch) => (
                      <Listbox.Option
                        key={branch}
                        className={({ active }) =>
                          `relative cursor-default select-none py-2 pl-10 pr-4 ${
                            active
                              ? "bg-aurora-100 text-aurora-900"
                              : "text-gray-900"
                          }`
                        }
                        value={branch}
                      >
                        {({ selected }) => (
                          <>
                            <span
                              className={`block truncate ${
                                selected ? "font-medium" : "font-normal"
                              }`}
                            >
                              {branch}
                            </span>
                          </>
                        )}
                      </Listbox.Option>
                    ))
                  )}
                </Listbox.Options>
              </Transition>
            </div>
          </Listbox>
        </div>
        <div className="flex items-center space-x-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="rounded-full bg-aurora-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-aurora-600 dark:bg-sky-600/30 dark:hover:bg-sky-500/30"
          >
            Commit
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="rounded-full bg-blossom-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blossom-600 dark:bg-purple-600/30 dark:hover:bg-purple-500/30"
          >
            New PR
          </motion.button>
          <motion.button
            onClick={handleAddNewRepo}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="rounded-full bg-green-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600 dark:bg-green-600/30 dark:hover:bg-green-500/30"
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Add New Repo
          </motion.button>
          <motion.button
            onClick={handleRefresh}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
            disabled={isRefreshing}
          >
            <motion.div
              animate={{ rotate: isRefreshing ? 360 : 0 }}
              transition={{
                duration: 1,
                repeat: isRefreshing ? Infinity : 0,
                ease: "linear",
              }}
            >
              <FontAwesomeIcon icon={faRefresh} className="w-full" />
            </motion.div>
          </motion.button>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full bg-aurora-100 p-2 text-aurora-800 hover:bg-aurora-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
          >
            {theme === "dark" ? (
              <SunIcon className="h-5 w-5" />
            ) : (
              <MoonIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
