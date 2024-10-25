
import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { toast } from 'react-toastify';
import { api } from '~/trpc/react';

interface CreateBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBranchCreated: (newBranch: string) => void;
  branches: string[];
  org: string;
  repoName: string;
}

export default function CreateBranchModal({
  isOpen,
  onClose,
  onBranchCreated,
  branches,
  org,
  repoName,
}: CreateBranchModalProps) {
  const [branchName, setBranchName] = useState('');
  const [baseBranch, setBaseBranch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (branches.length > 0) {
      setBaseBranch(branches[0]);
    }
  }, [branches]);

  const createBranchMutation = api.github.createBranch.useMutation({
    onSuccess: () => {
      toast.success('Branch created successfully');
      onBranchCreated(branchName);
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to create branch: ${error.message}`);
      setError(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!branchName.trim()) {
      setError('Branch name cannot be empty');
      return;
    }

    if (branches.includes(branchName)) {
      setError('Branch name already exists');
      return;
    }

    createBranchMutation.mutate({
      org,
      repoName,
      branchName,
      baseBranch,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Create Branch Modal"
      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50"
    >
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Create New Branch</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="branchName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Branch Name
          </label>
          <input
            type="text"
            id="branchName"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="baseBranch" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Base Branch
          </label>
          <select
            id="baseBranch"
            value={baseBranch}
            onChange={(e) => setBaseBranch(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          >
            {branches.map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:hover:bg-slate-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createBranchMutation.isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createBranchMutation.isLoading ? 'Creating...' : 'Create Branch'}
          </button>
        </div>
      </form>
    </Modal>
  );
}