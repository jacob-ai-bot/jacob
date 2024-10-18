"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faSave, faUnlink } from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import { api } from "~/trpc/react";

export default function SettingsPage({
  params,
}: {
  params: { org: string; repo: string };
}) {
  const [localPath, setLocalPath] = useState("");
  const [email, setEmail] = useState("");
  const router = useRouter();

  const { data: accountSettings, refetch: refetchSettings } =
    api.settings.getAccountSettings.useQuery();

  const { mutate: updateSettings } = api.settings.updateAccountSettings.useMutation({
    onSuccess: () => {
      toast.success("Settings updated successfully");
      refetchSettings();
    },
    onError: (error) => {
      toast.error(`Failed to update settings: ${error.message}`);
    },
  });

  useEffect(() => {
    if (accountSettings) {
      setLocalPath(accountSettings.localPath || "");
      setEmail(accountSettings.email || "");
    }
  }, [accountSettings]);

  const handleSaveLocalPath = () => {
    updateSettings({ localPath });
  };

  const handleSaveEmail = () => {
    updateSettings({ email });
  };

  const handleDisconnectGitHub = async () => {
    // Implement GitHub disconnection logic here
    toast.info("GitHub account disconnection not implemented");
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Settings</h1>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">Repository Management</h2>
        <Link
          href={`/setup/${params.org}`}
          className="inline-flex items-center rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          Add Repository
        </Link>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">Local Path Configuration</h2>
        <div className="flex items-center">
          <input
            type="text"
            value={localPath}
            onChange={(e) => setLocalPath(e.target.value)}
            className="mr-2 w-full rounded-md border p-2"
            placeholder="Enter local path"
          />
          <button
            onClick={handleSaveLocalPath}
            className="inline-flex items-center rounded-md bg-green-500 px-4 py-2 text-white hover:bg-green-600"
          >
            <FontAwesomeIcon icon={faSave} className="mr-2" />
            Save
          </button>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">Account Settings</h2>
        <div className="mb-4 flex items-center">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mr-2 w-full rounded-md border p-2"
            placeholder="Enter email"
          />
          <button
            onClick={handleSaveEmail}
            className="inline-flex items-center rounded-md bg-green-500 px-4 py-2 text-white hover:bg-green-600"
          >
            <FontAwesomeIcon icon={faSave} className="mr-2" />
            Save
          </button>
        </div>
        <button
          onClick={handleDisconnectGitHub}
          className="inline-flex items-center rounded-md bg-red-500 px-4 py-2 text-white hover:bg-red-600"
        >
          <FontAwesomeIcon icon={faUnlink} className="mr-2" />
          Disconnect GitHub Account
        </button>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">Branch Build Status</h2>
        {accountSettings?.doesCurrentBranchBuild !== undefined && (
          <div
            className={`rounded-md p-4 ${
              accountSettings.doesCurrentBranchBuild
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {accountSettings.doesCurrentBranchBuild
              ? "Current branch builds successfully"
              : "Current branch build failed"}
          </div>
        )}
      </section>
    </div>
  );
}

