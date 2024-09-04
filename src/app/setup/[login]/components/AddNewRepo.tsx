"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "~/trpc/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faPlus,
  faCog,
  faArrowRight,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface AddNewRepoProps {
  login: string;
}

const AddNewRepo: React.FC<AddNewRepoProps> = ({ login }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const router = useRouter();

  const { data: repos, isLoading: isLoadingRepos } =
    api.github.getRepos.useQuery({ includeProjects: true });

  const { data: githubAppName } = api.github.getGithubAppName.useQuery();

  const orgs = useMemo(() => {
    if (!repos) return [];
    const orgSet = new Set(repos.map((repo) => repo.org));
    return Array.from(orgSet);
  }, [repos]);

  const filteredRepos = useMemo(() => {
    if (!repos) return [];
    return repos.filter(
      (repo) =>
        repo.full_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (!selectedOrg || repo.org === selectedOrg),
    );
  }, [repos, searchTerm, selectedOrg]);

  const handleAddGitHubAccount = () => {
    const url = `https://github.com/apps/${githubAppName}/installations/new`;
    router.push(url);
  };

  if (isLoadingRepos) {
    return (
      <div className="">
        <div className="text-center">
          <motion.div
            animate={{
              rotate: [0, 360],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <FontAwesomeIcon
              icon={faCog}
              className="h-12 w-12 text-aurora-500"
            />
          </motion.div>
          <p className="mt-4 text-lg font-semibold text-aurora-700">
            Syncing your repositories...
          </p>
        </div>
      </div>
    );
  }
  if (repos && repos.length === 0) {
    return (
      <div className="mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-aurora-100 bg-gradient-to-br from-white to-indigo-50/50 p-12 shadow-xl"
        >
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="mb-8"
          >
            <svg
              className="mx-auto h-20 w-20 text-blossom-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <defs>
                <linearGradient id="shimmer" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.9">
                    <animate
                      attributeName="offset"
                      values="-1; 2"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </stop>
                  <stop offset="50%" stopColor="currentColor" stopOpacity="0.4">
                    <animate
                      attributeName="offset"
                      values="-0.5; 2.5"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </stop>
                  <stop
                    offset="100%"
                    stopColor="currentColor"
                    stopOpacity="0.9"
                  >
                    <animate
                      attributeName="offset"
                      values="0; 3"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </stop>
                </linearGradient>
              </defs>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 10V3L4 14h7v7l9-11h-7z"
                stroke="url(#shimmer)"
              />
            </svg>
          </motion.div>
          <h1 className="mb-2 font-crimson text-5xl font-bold tracking-tight text-aurora-900">
            It&apos;s Time to Code
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-xl text-aurora-700">
            Let&apos;s supercharge your development process with AI-powered
            collaboration. Add your first repository to get started.
          </p>
          <button
            onClick={handleAddGitHubAccount}
            className="group relative inline-flex items-center overflow-hidden rounded-full bg-indigo-600 px-8 py-3 text-lg font-semibold text-white transition-all duration-300 ease-in-out hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <span className="absolute right-0 translate-x-full transition-transform group-hover:-translate-x-4">
              <FontAwesomeIcon icon={faArrowRight} />
            </span>
            <span className="transition-all group-hover:mr-4">
              Add Your First Repository
            </span>
          </button>
          <p className="mt-6 text-sm text-gray-500">
            Connect your GitHub account to unlock the full potential of JACoB.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="mb-2 font-crimson text-5xl font-bold tracking-tight text-aurora-900">
          Create a New Project
        </h1>
        <p className="mb-8 text-xl text-aurora-700">
          Choose a repository to create a new JACoB project.
        </p>
      </motion.div>

      <div className="overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="rounded-t-3xl border border-aurora-100 border-b-aurora-50 bg-aurora-50 p-6">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-x-4 sm:space-y-0">
            <div className="relative w-full sm:w-1/2">
              <select
                className="w-full appearance-none rounded-full border-2 border-aurora-200 bg-white px-4 py-2 pr-8 text-aurora-700 shadow-sm transition-colors focus:border-aurora-500 focus:outline-none focus:ring-2 focus:ring-aurora-500/50"
                value={selectedOrg ?? ""}
                onChange={(e) => setSelectedOrg(e.target.value ?? null)}
                style={{ WebkitAppearance: "none", MozAppearance: "none" }}
              >
                <option value="">All Organizations</option>
                {orgs.map((org) => (
                  <option key={org} value={org}>
                    {org}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative w-full sm:w-1/2">
              <input
                type="text"
                placeholder="Search repositories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-full border-2 border-aurora-200 py-2 pl-10 pr-4 text-aurora-700 shadow-sm transition-colors focus:border-aurora-500 focus:outline-none focus:ring-2 focus:ring-aurora-500/50"
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <FontAwesomeIcon
                  icon={faSearch}
                  className="h-5 w-5 text-aurora-400"
                />
              </div>
            </div>
          </div>
        </div>

        <ul className="divide-y divide-aurora-100">
          <AnimatePresence>
            {filteredRepos.map((repo) => (
              <motion.li
                key={repo.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between p-6 transition-colors hover:bg-aurora-50"
              >
                <div>
                  <h3 className="font-medium text-aurora-900">
                    {repo.full_name}
                  </h3>
                  <p className="mt-1 text-sm text-aurora-600">
                    {repo.description}
                  </p>
                </div>
                {repo.projectId && repo.hasSettings ? (
                  <Link href={`/dashboard/${repo.org}/${repo.repo}`}>
                    <button className="rounded-full bg-meadow-100 px-4 py-2 text-sm font-medium text-meadow-700 transition-colors hover:bg-meadow-200">
                      View Project
                    </button>
                  </Link>
                ) : (
                  <Link href={`/setup/${login}/${repo.org}/${repo.repo}/setup`}>
                    <button className="rounded-full bg-blossom-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blossom-600">
                      {repo.hasSettings ? "Edit Settings" : "Create Project"}
                    </button>
                  </Link>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={handleAddGitHubAccount}
          className="inline-flex items-center rounded-full bg-gradient-to-r from-sunset-400 to-sunset-500 px-6 py-3 text-base font-medium text-white transition-all hover:from-sunset-500 hover:to-sunset-600 focus:outline-none focus:ring-2 focus:ring-sunset-500 focus:ring-offset-2"
        >
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          Add New Repository
        </button>
      </div>
    </div>
  );
};

export default AddNewRepo;
