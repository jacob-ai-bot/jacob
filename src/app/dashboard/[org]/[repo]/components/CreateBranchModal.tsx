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
  const [selectedBaseBranch, setSelectedBaseBranch] = useState(baseBranches[0] || "");
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
      toast