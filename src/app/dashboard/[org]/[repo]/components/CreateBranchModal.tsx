import React, { useState } from "react";
import { motion } from "framer-motion";
import { api } from "~/trpc/react";
import { toast } from "react-toastify";

interface CreateBranchModalProps {
  org: string;
  repo: string;
  baseBranches: string[];
  onClose: () => void;
  onSuccess: (newBranchName: string) => void;
}

export default function CreateBranchModal({
  org,
  repo,
  baseBranches,
  onClose,
  onSuccess,
}: CreateBranchModalProps) {
  const [newBranchName, setNewBranchName] = useState("");
  const [selectedBaseBranch, setSelectedBaseBranch] = useState(
    baseBranches[0] || "",
  );
  const [isLoading, setIsLoading] = useState(false);

  const createBranchMutation = api.github.createBranch.useMutation({
    onSuccess: () => {
      onSuccess(newBranchName);
    },
    onError: (error) => {
      toast.error(`Failed to create branch: ${error.message}`);
      setIsLoading(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim() || !selectedBaseBranch) {
      toast.error("Please enter a branch name and select a base branch");
      return;
    }
    setIsLoading(true);
    createBranchMutation.mutate({
      org,
      repo,
      branchName: newBranchName,
      baseBranch: selectedBaseBranch,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800"
      >
        <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
          Create New Branch
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="branchName"
              className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
            >
              Branch Name
            </label>
            <input
              type="text"
              id="branchName"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
              placeholder="Enter branch name"
              required
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="baseBranch"
              className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
            >
              Base Branch
            </label>
            <select
              id="baseBranch"
              value={selectedBaseBranch}
              onChange={(e) => setSelectedBaseBranch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
              required
            >
              {baseBranches.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {isLoading ? "Creating..." : "Create Branch"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
