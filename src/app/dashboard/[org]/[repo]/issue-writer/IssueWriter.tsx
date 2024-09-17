"use client";

import React, { useState, useRef, useEffect } from "react";
import { type Project } from "~/server/db/tables/projects.table";
import { api } from "~/trpc/react";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faSave,
  faTimes,
  faExternalLinkAlt,
  faEye,
} from "@fortawesome/free-solid-svg-icons";
import MarkdownRenderer from "../components/MarkdownRenderer";
import LoadingIndicator from "../components/LoadingIndicator";
import { type ExtractedIssueInfo } from "~/server/code/extractedIssue";

interface IssueWriterProps {
  org: string;
  repo: string;
  project: Project;
}

const TEXTAREA_MIN_HEIGHT = "600px";
const IssueWriter: React.FC<IssueWriterProps> = ({ org, repo, project }) => {
  const [issueTitle, setIssueTitle] = useState("");
  const [issueBody, setIssueBody] = useState("");
  const [isEditing, setIsEditing] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [textareaHeight, setTextareaHeight] = useState(TEXTAREA_MIN_HEIGHT);
  const [createdIssueNumber, setCreatedIssueNumber] = useState<number | null>(
    34,
  );
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [extractedIssueInfo, setExtractedIssueInfo] =
    useState<ExtractedIssueInfo | null>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const createIssueMutation = api.github.createIssue.useMutation();
  const evaluateIssueMutation = api.github.evaluateIssue.useMutation();
  const {
    data: createdIssue,
    refetch: getCreatedIssue,
    isLoading: isLoadingCreatedIssue,
  } = api.github.getIssue.useQuery(
    {
      org,
      repo,
      issueId: createdIssueNumber ?? 0,
    },
    {
      enabled: createdIssueNumber !== null,
    },
  );

  useEffect(() => {
    if (isEditing) {
      titleInputRef.current?.focus();
    }
  }, [isEditing]);

  const handleCreateIssue = async () => {
    if (!issueTitle.trim() || !issueBody.trim()) {
      toast.error("Please provide both a title and body for the issue.");
      return;
    }

    setIsCreating(true);
    try {
      const result = await createIssueMutation.mutateAsync({
        repo: `${org}/${repo}`,
        title: issueTitle,
        body: issueBody,
      });

      setCreatedIssueNumber(result.number);
      await getCreatedIssue();
      toast.success("Issue created successfully!");
      setIsEditing(false);
    } catch (error) {
      console.error("Error creating issue:", error);
      toast.error("Failed to create the issue.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleNewIssue = () => {
    setIssueTitle("");
    setIssueBody("");
    setCreatedIssueNumber(null);
    setIsEditing(true);
  };

  const adjustTextareaHeight = () => {
    if (bodyTextareaRef.current) {
      bodyTextareaRef.current.style.height = TEXTAREA_MIN_HEIGHT;
      const scrollHeight = bodyTextareaRef.current.scrollHeight;
      bodyTextareaRef.current.style.height = scrollHeight + "px";
      setTextareaHeight(`${Math.min(scrollHeight, 1200)}px`); // Max height of 1200px
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setIssueBody(e.target.value);
    adjustTextareaHeight();
  };

  const ExtractedIssueDetails: React.FC<{ info: ExtractedIssueInfo }> = ({
    info,
  }) => (
    <div className="mt-4 rounded-md border bg-gray-100 p-4 dark:bg-gray-700">
      <h3 className="text-xl font-semibold">Issue Evaluation</h3>
      <p>
        <strong>Steps to Address Issue:</strong>{" "}
        {info.stepsToAddressIssue ?? "N/A"}
      </p>
      <p>
        <strong>Issue Quality Score:</strong> {info.issueQualityScore ?? "N/A"}
      </p>
      <p>
        <strong>Commit Title:</strong> {info.commitTitle ?? "N/A"}
      </p>
      <p>
        <strong>Files to Create:</strong>{" "}
        {info.filesToCreate?.join(", ") ?? "N/A"}
      </p>
      <p>
        <strong>Files to Update:</strong>{" "}
        {info.filesToUpdate?.join(", ") ?? "N/A"}
      </p>
      <button
        // onClick={handleUpdateIssue}
        className="mt-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
      >
        Update Issue
      </button>
    </div>
  );

  const handleEvaluateIssue = async () => {
    if (!issueTitle.trim() || !issueBody.trim()) {
      toast.error("Please provide both a title and body for the issue.");
      return;
    }

    setIsEvaluating(true);
    try {
      const evaluation = (await evaluateIssueMutation.mutateAsync({
        repo: `${org}/${repo}`,
        title: issueTitle,
        body: issueBody,
      })) as ExtractedIssueInfo;
      setExtractedIssueInfo(evaluation);
      toast.success("Issue evaluated successfully!");
    } catch (error) {
      console.error("Error evaluating issue:", error);
      toast.error("Failed to evaluate the issue.");
    } finally {
      setIsEvaluating(false);
    }
  };

  //   const handleUpdateIssue = async () => {
  //     if (!extractedIssueInfo) {
  //       toast.error("No evaluation data to update the issue.");
  //       return;
  //     }
  //     setIsCreating(true);
  //     try {
  //        api.github.updateIssue.useMutation({
  //         org,
  //         repo,
  //         issueId: createdIssueNumber ?? 0,
  //         commitTitle: extractedIssueInfo.commitTitle,
  //         // Include other necessary fields from extractedIssueInfo
  //       });
  //       toast.success("Issue updated successfully!");
  //     } catch (error) {
  //       console.error("Error updating issue:", error);
  //       toast.error("Failed to update the issue.");
  //     } finally {
  //       setIsCreating(false);
  //     }
  //   };

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-clip rounded-md bg-white/50 p-4 shadow-sm dark:bg-slate-800">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-aurora-700 dark:text-aurora-300">
          Issue Creator
        </h2>
        <button
          onClick={handleNewIssue}
          className="rounded-full bg-sunset-400 px-4 py-2 text-white transition-colors hover:bg-sunset-500 dark:bg-sunset-600 dark:hover:bg-sunset-500"
        >
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          New Issue
        </button>
      </div>
      {isEditing ? (
        <div className="flex flex-1 flex-col space-y-4">
          <input
            ref={titleInputRef}
            type="text"
            value={issueTitle}
            onChange={(e) => setIssueTitle(e.target.value)}
            className="w-full rounded-md border border-gray-300 p-2 text-lg font-semibold focus:border-aurora-400 focus:outline-none focus:ring-2 focus:ring-aurora-200 dark:border-gray-600 dark:bg-gray-800 dark:focus:border-aurora-400 dark:focus:ring-aurora-800"
            placeholder="Issue Title"
          />
          <div className="flex-1">
            <div className="relative flex w-full items-center rounded-2xl border border-aurora-100 bg-aurora-50/30 p-1.5 dark:border-sky-600/30 dark:bg-slate-700">
              <textarea
                ref={bodyTextareaRef}
                value={issueBody}
                onChange={handleTextareaChange}
                className="hide-scrollbar m-0 h-full w-full resize-none border-0 bg-transparent px-3 py-2 text-dark-blue focus:ring-0 focus-visible:ring-0 dark:text-slate-100"
                placeholder="Describe the issue..."
                style={{ height: textareaHeight }}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              onClick={handleEvaluateIssue}
              className="flex items-center rounded-md bg-yellow-400 px-4 py-2 text-white transition-colors hover:bg-yellow-500 dark:bg-yellow-600 dark:hover:bg-yellow-500"
            >
              <FontAwesomeIcon icon={faEye} className="mr-2" />
              Evaluate
            </button>
            <button
              onClick={handleCreateIssue}
              disabled={isCreating || isEvaluating || !extractedIssueInfo}
              className={`flex items-center rounded-md px-4 py-2 text-white transition-colors ${
                isCreating || isEvaluating || !extractedIssueInfo
                  ? "cursor-not-allowed bg-gray-400"
                  : "bg-aurora-400 hover:bg-aurora-500 dark:bg-aurora-600 dark:hover:bg-aurora-500"
              }`}
            >
              <FontAwesomeIcon icon={faSave} className="mr-2" />
              {isCreating ? "Creating..." : "Create Issue"}
            </button>
          </div>
        </div>
      ) : createdIssue ? (
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col items-start justify-between space-y-2 sm:flex-row sm:items-center sm:space-y-0">
            <div className="flex items-center space-x-2">
              <span className="rounded-full bg-aurora-100 px-2 py-1 text-sm font-medium text-aurora-800 dark:bg-aurora-900 dark:text-aurora-200">
                #{createdIssueNumber}
              </span>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {createdIssue.title}
              </h3>
            </div>
            <a
              href={`https://github.com/${org}/${repo}/issues/${createdIssueNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-md bg-aurora-50 px-3 py-1 text-sm font-medium text-aurora-700 transition-colors hover:bg-aurora-100 dark:bg-aurora-900/30 dark:text-aurora-300 dark:hover:bg-aurora-800/50"
            >
              View on GitHub
              <FontAwesomeIcon
                icon={faExternalLinkAlt}
                className="ml-2 h-3 w-3"
              />
            </a>
          </div>
          <div className="mt-4 rounded-md bg-gray-50 p-4 dark:bg-gray-900/50">
            <div className="prose max-w-none dark:prose-invert">
              <MarkdownRenderer>{createdIssue.body}</MarkdownRenderer>
            </div>
          </div>
        </div>
      ) : isCreating || isLoadingCreatedIssue ? (
        <div className="flex flex-col items-center justify-center">
          <div className="mb-8 text-center text-2xl font-bold text-gray-500 dark:text-gray-400">
            Creating issue...
          </div>
          <LoadingIndicator />
        </div>
      ) : (
        <div className="text-center text-gray-500 dark:text-gray-400">
          No issue created yet. Click &quot;New Issue&quot; to start.
        </div>
      )}
      {extractedIssueInfo && (
        <ExtractedIssueDetails info={extractedIssueInfo} />
      )}
    </div>
  );
};

export default IssueWriter;
