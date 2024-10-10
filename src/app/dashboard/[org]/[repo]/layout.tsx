"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faListCheck,
  faComments,
  faCode,
  faPaintBrush,
  faCog,
  faPencil,
  faRobot,
  faRefresh,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { SunIcon, MoonIcon } from "@heroicons/react/24/solid";
import { usePathname, useRouter } from "next/navigation";
import { debounce } from "lodash";
import { api } from "~/trpc/react";
import { toast } from "react-toastify";

const navItems = [
  { name: "Todos", icon: faListCheck },
  { name: "Assigned Tasks", icon: faRobot },
  { name: "Chat", icon: faComments },
  { name: "Issue Writer", icon: faPencil },
  { name: "Code Visualizer", icon: faCode },
  { name: "Design", icon: faPaintBrush },
];

export default function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { org: string; repo: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeItem, setActiveItem] = useState(() => {
    const path = pathname?.split("/").pop() ?? "";
    return (
      navItems.find(
        (item) => item.name.toLowerCase().replace(" ", "-") === path,
      )?.name ?? "Todos"
    );
  });

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [changedFiles, setChangedFiles] = useState<
    { path: string; content: string }[]
  >([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const debounceExpandRef = useRef<ReturnType<typeof debounce>>();
  const debounceCollapseRef = useRef<ReturnType<typeof debounce>>();

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

  const commitChangesMutation = api.github.commitChanges.useMutation({
    onSuccess: (data: { commitUrl?: string }) => {
      toast.success("Commit successful!");
      if (data.commitUrl) {
        toast.info(
          <a href={data.commitUrl} target="_blank" rel="noopener noreferrer">
            View Commit on GitHub
          </a>,
        );
      }
      setChangedFiles([]);
    },
    onError: (error: Error) => {
      toast.error(`Commit failed: ${error.message}`);
    },
  });

  useEffect(() => {
    debounceExpandRef.current = debounce((value: boolean) => {
      setIsExpanded(value);
    }, 500);

    debounceCollapseRef.current = debounce((value: boolean) => {
      setIsExpanded(value);
    }, 0);

    return () => {
      debounceExpandRef.current?.cancel();
      debounceCollapseRef.current?.cancel();
    };
  }, []);

  const handleMouseEnter = useCallback(() => {
    debounceCollapseRef.current?.cancel();
    debounceExpandRef.current?.(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    debounceExpandRef.current?.cancel();
    if (isExpanded) {
      debounceCollapseRef.current?.(false);
    }
  }, [isExpanded]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const path = pathname?.split("/").pop() ?? "";
    const newActiveItem =
      navItems.find(
        (item) => item.name.toLowerCase().replace(" ", "-") === path,
      )?.name ?? "Todos";
    setActiveItem(newActiveItem);
  }, [pathname]);

  if (!mounted) return null;

  const handleRepoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedRepo = e.target.value;
    if (selectedRepo) {
      router.push(`/dashboard/${selectedRepo}`);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    refreshContextMutation.mutate({
      org: params.org,
      repoName: params.repo,
    });
    void refetch();

    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Codebase context refreshed successfully");
    }, 10000);
  };

  const handleCommit = () => {
    if (changedFiles.length === 0) {
      toast.warn("No changes to commit");
      return;
    }

    const commitMessage = "Commit changes from dashboard"; // You might want to prompt the user for a commit message

    commitChangesMutation.mutate({
      org: params.org,
      repo: params.repo,
      branch: "main", // You might want to make this dynamic
      commitMessage,
      files: changedFiles,
    });
  };

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  return (
    <div className="flex h-screen w-full border-r border-r-aurora-300 bg-gradient-to-br from-aurora-50 to-blossom-50 text-dark-blue dark:border-r-dark-blue dark:from-slate-900 dark:to-slate-800 dark:text-slate-100">
      {/* Left Sidebar */}
      <motion.aside
        initial={{ width: "72px" }}
        animate={{ width: isExpanded ? "250px" : "72px" }}
        onHoverStart={handleMouseEnter}
        onHoverEnd={handleMouseLeave}
        transition={{ duration: isExpanded ? 0.3 : 0.2 }}
        className="absolute z-50 flex h-screen flex-col border-r-0 border-r-aurora-200/80 bg-white/90 dark:border-r-0  dark:bg-slate-800/90"
      >
        <div
          className={`justify-left ml-4 flex h-16 items-center bg-white pt-1.5 font-gooper dark:bg-slate-800`}
        >
          <Image
            src="/images/logo.png"
            width={34}
            height={34}
            alt="JACoB Logo"
          />
          {isExpanded && (
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="ml-2 font-gooper text-2xl font-bold text-aurora-900 dark:text-slate-100"
            >
              JACoB
            </motion.h1>
          )}
        </div>

        <nav className="mt-4 flex-grow px-2">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <motion.li key={item.name} transition={{ duration: 0.2 }}>
                <Link
                  href={`/dashboard/${params.org}/${params.repo}/${item.name.toLowerCase().replace(" ", "-")}`}
                  className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    activeItem === item.name
                      ? "hover:bg-aurora-white bg-aurora-50 text-aurora-500 hover:text-aurora-500 dark:bg-sky-900 dark:text-sky-300"
                      : "text-dark-blue hover:bg-aurora-50 hover:text-aurora-500 dark:text-slate-300 dark:hover:bg-sky-900/50 dark:hover:text-sky-300"
                  }`}
                  onClick={() => setActiveItem(item.name)}
                >
                  <FontAwesomeIcon
                    icon={item.icon}
                    className={`ml-[6px] h-5 w-5`}
                  />
                  {isExpanded && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className="ml-3 text-nowrap"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </Link>
              </motion.li>
            ))}
          </ul>
        </nav>
        <motion.div className="mb-6 mt-auto space-y-2 px-2">
          <Link
            href={`/setup/${params.org}`}
            className={`flex items-center justify-center rounded-lg bg-green-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600 dark:bg-green-600/30 dark:hover:bg-green-500/30`}
          >
            <FontAwesomeIcon icon={faPlus} className="h-5 w-5" />
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="ml-3"
              >
                Add New Repo
              </motion.span>
            )}
          </Link>{" "}
          <Link
            href={`/dashboard/${params.org}/${params.repo}/settings`}
            className={`flex items-center justify-center rounded-lg bg-sunset-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-sunset-600 dark:bg-sky-600/30 dark:hover:bg-sky-500/30`}
          >
            <FontAwesomeIcon icon={faCog} className="h-5 w-5" />
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="ml-3"
              >
                Settings
              </motion.span>
            )}
          </Link>
        </motion.div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white/90 pl-[96px] shadow-sm dark:bg-slate-800">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <select
                value={`${params.org}/${params.repo}`}
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
                className="rounded-full border-none bg-aurora-50 px-4 py-2 pr-8 text-sm text-dark-blue transition-all focus:ring-2 focus:ring-aurora-500 dark:bg-slate-700 dark:text-slate-100 dark:focus:ring-sky-400"
                defaultValue="main"
                disabled
              >
                <option value="main">main</option>
              </select>
            </div>
            <div className="flex items-center space-x-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCommit}
                className="rounded-full bg-aurora-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-aurora-600 dark:bg-sky-600/30 dark:hover:bg-sky-500/30"
                disabled={commitChangesMutation.isLoading}
              >
                {commitChangesMutation.isLoading ? "Committing..." : "Commit"}
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
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleOpenModal}
                className="rounded-full bg-aurora-300 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-aurora-400 dark:bg-sky-700/30 dark:hover:bg-sky-600/30"
              >
                Changed Files ({changedFiles.length})
              </motion.button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="hide-scrollbar flex-1 overflow-auto bg-gradient-to-br from-aurora-50 to-blossom-50 p-6 pl-[96px] dark:from-slate-900 dark:to-slate-800">
          {children}
        </main>
      </div>
    </div>
  );
}
__FILEPATH__ /
  src /
  app /
  dashboard /
  [org] /
  [repo] /
  components /
  ChangedFilesModal.tsx__;
