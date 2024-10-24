"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRefresh } from "@fortawesome/free-solid-svg-icons";
import { SunIcon, MoonIcon } from "@heroicons/react/24/solid";
import { api } from "~/trpc/react";
import { toast } from "react-toastify";
import CreateBranchModal from "./CreateBranchModal";

interface HeaderProps {
  org: string;
  repoName: string;
}

export default function Header({ org, repoName }: HeaderProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>("main");
  const [isCreateBranchModalOpen, setIsCreateBranchModalOpen] = useState(false);

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

  const {
    data: branches,
    isLoading: isLoadingBranches,
    refetch: refetchBranches,
  } = api.github.getBranches.useQuery(
    { org, repo: repoName },
    { enabled: !!org && !!repoName },
  );

  useEffect(() => {
    if (branches && branches.length > 0) {
      setSelectedBranch(branches[0] ?? "main");
    }
  }, [branches]);

  const handleRepoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedRepo = e.target.value;
    if (selectedRepo) {
      router.push(`/dashboard/${selectedRepo}`);
    }
  };

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newBranch = e.target.value;
    setSelectedBranch(newBranch);
    console.log(`Selected branch: ${newBranch}`);
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

  const handleCreateBranchSuccess = (newBranchName: string) => {
    setSelectedBranch(newBranchName);
    void refetchBranches();
    setIsCreateBranchModalOpen(false);
    toast.success(`Branch "${newBranchName}" created successfully`);
  };

  return (
    <header className="bg-white/90 pl-[96px] shadow-sm dark:bg-slate-800">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <select
            value={`${org}/${repoName}`}
            onChange={handleRepoChange}
            className="rounded-full border-none bg-aurora-50 px-4 py-2 pr-8 text-sm text-dark-blue transition-all focus:ring-2 focus:ring-aurora-500 dark:bg-slate-700 dark:text-slate-100 dark:focus:ring-sky-400"
          >
            <option value="">Select repository</option>
            {isLoadingRepos ? (
              <option>Loading...</option>
            ) : (
              repos?.map((repo) => (
                <option key={repo.id} value={repo.full_name}>
                  {repo.full_name}
                </option>
              ))
            )}
          </select>
          <select
            value={selectedBranch}
            onChange={handleBranchChange}
            className="rounded-full border-none bg-aurora-50 px-4 py-2 pr-8 text-sm text-dark-blue transition-all focus:ring-2 focus:ring-aurora-500 dark:bg-slate-700 dark:text-slate-100 dark:focus:ring-sky-400"
          >
            {isLoadingBranches ? (
              <option>Loading branches...</option>
            ) : (
              branches?.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))
            )}
          </select>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsCreateBranchModalOpen(true)}
            className="rounded-full bg-aurora-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-aurora-600 dark:bg-sky-600/30 dark:hover:bg-sky-500/30"
          >
            Create Branch
          </motion.button>
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
      {isCreateBranchModalOpen && (
        <CreateBranchModal
          org={org}
          repo={repoName}
          baseBranches={branches ?? []}
          onClose={() => setIsCreateBranchModalOpen(false)}
          onSuccess={handleCreateBranchSuccess}
        />
      )}
    </header>
  );
}
