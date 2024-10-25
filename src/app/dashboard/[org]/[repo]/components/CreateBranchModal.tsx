import React, { useState } from "react";
import { motion } from "framer-motion";
import Modal from "react-modal";
import { api } from "~/trpc/react";
import { toast } from "react-toastify";

interface CreateBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateBranch: (newBranch: string) => void;
  org: string;
  repo: string;
  branches: string[] | undefined;
}

export default function CreateBranchModal({
  isOpen,
  onClose,
  onCreateBranch,
  org,
  repo,
  branches = [],
}: CreateBranchModalProps) {
  const [branchName, setBranchName] = useState("");
  const [baseBranch, setBaseBranch] = useState(branches[0] ?? "main");
  const [isLoading, setIsLoading] = useState(false);

  const createBranchMutation = api.github.createBranch.useMutation({
    onSuccess: () => {
      onCreateBranch(branchName);
      onClose();
      setBranchName("");
    },
    onError: (error) => {
      toast.error(`Failed to create branch: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) {
      toast.error("Branch name cannot be empty");
      return;
    }
    if (branches.includes(branchName)) {
      toast.error("Branch name already exists");
      return;
    }
    setIsLoading(true);
    createBranchMutation.mutate({
      org,
      repo,
      branchName,