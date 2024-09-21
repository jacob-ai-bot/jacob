"use client";

import React, { useState, useRef, useEffect } from "react";
import { type Project } from "~/server/db/tables/projects.table";
import { api } from "~/trpc/react";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faSave,
  faExternalLinkAlt,
  faEye,
} from "@fortawesome/free-solid-svg-icons";
import MarkdownRenderer from "../components/MarkdownRenderer";
import LoadingIndicator from "../components/LoadingIndicator";
import { type ExtractedIssueInfo } from "~/server/code/extractedIssue";
import ExtractedIssueDetails from "./components/ExtractedIssueDetails";

interface IssueWriterProps {
  org: string;
  repo: string;
}

const TEXTAREA_MIN_HEIGHT = "600px";
const IssueWriter: React.FC<IssueWriterProps> = ({ org, repo }) => {
  const [issueTitle, setIssueTitle] = useState("");
  const [issueBody, setIssueBody] = useState("");
  const [isEditing, setIsEditing] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [textareaHeight, setTextareaHeight] = useState(TEXTAREA_MIN_HEIGHT);
  const [createdIssueNumber, setCreatedIssueNumber] = useState<number | null>(
    34,
  );
  const [isEvaluating, setIsEvaluating] = useState(false);

  const [rewrittenIssue, setRewrittenIssue] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: project, isLoading: isLoadingProject } =
    api.events.getProject.useQuery({
      org,
      repo,
    });
  const createIssueMutation = api.github.createIssue.useMutation();
  const rewriteIssueMutation = api.github.rewriteIssue.useMutation();
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
      setRewrittenIssue(null);
      setFeedback(null);
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

  const handleEvaluateIssue = async () => {
    if (!issueTitle.trim() || !issueBody.trim()) {
      toast.error("Please provide both a title and body for the issue.");
      return;
    }

    setIsEvaluating(true);
    try {
      // Call rewriteIssue mutation
      const rewrittenIssueResult = await rewriteIssueMutation.mutateAsync({
        title: issueTitle,
        body: issueBody,
      });

      setRewrittenIssue(rewrittenIssueResult.rewrittenIssue);
      setFeedback(rewrittenIssueResult.feedback);
    } catch (error) {
      console.error("Error evaluating issue:", error);
      toast.error("Failed to evaluate the issue.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleUpdateIssue = async (body: string) => {
    if (!body.trim()) {
      toast.error("Please provide a body for the issue.");
      return;
    }
    // If the first line of the issue is a h1 title (starting with #), remove it and make it the title (remove the #)
    if (body.startsWith("#") && body.split("\n")[0]?.trim().startsWith("#")) {
      setIssueTitle(body.split("\n")[0]!.trim().replace("#", ""));
      setIssueBody(body.slice(body.indexOf("\n") + 1).trim());
    } else {
      setIssueBody(body);
    }
  };

  if (isLoadingProject || !project) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <LoadingIndicator />
      </div>
    );
  }

  return (
    <div
      className={`hide-scrollbar mx-auto flex h-full w-full flex-row space-x-4 overflow-hidden ${rewrittenIssue ? "max-w-[100rem]" : "max-w-4xl"}`}
    >
      <div className="hide-scrollbar h-full flex-1 overflow-y-auto">
        <div className="rounded-md bg-white/50 p-4 shadow-sm dark:bg-slate-800">
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
            <div className="flex w-full flex-1 flex-col space-y-4">
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
                  disabled={isEvaluating}
                  className={`flex items-center rounded-md px-4 py-2 text-white transition-colors ${
                    isEvaluating
                      ? "cursor-not-allowed bg-gray-400"
                      : "bg-yellow-400 hover:bg-yellow-500 dark:bg-yellow-600 dark:hover:bg-yellow-500"
                  }`}
                >
                  <FontAwesomeIcon icon={faEye} className="mr-2" />
                  {isEvaluating ? "Evaluating..." : "Evaluate"}
                </button>
                <button
                  onClick={handleCreateIssue}
                  disabled={isCreating || !rewrittenIssue}
                  className={`flex items-center rounded-md px-4 py-2 text-white transition-colors ${
                    isCreating || !rewrittenIssue
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
                <div className="flex items-center space-x-4">
                  {/* <span className="rounded-full bg-aurora-100 px-2 py-1 text-sm font-medium text-aurora-800 dark:bg-aurora-900 dark:text-aurora-200">
                    #{createdIssueNumber}
                  </span> */}
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {createdIssue.title}
                  </h3>
                </div>
                <a
                  href={`https://github.com/${org}/${repo}/issues/${createdIssueNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center whitespace-nowrap rounded-md bg-aurora-50 px-3 py-1 text-sm font-medium text-aurora-700 transition-colors hover:bg-aurora-100 dark:bg-aurora-900/30 dark:text-aurora-300 dark:hover:bg-aurora-800/50"
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
        </div>
      </div>
      {rewrittenIssue && (
        <div className="w-1/2 overflow-y-auto pb-8">
          <ExtractedIssueDetails
            feedback={feedback}
            rewrittenIssue={rewrittenIssue}
            onUpdateIssue={handleUpdateIssue}
          />
        </div>
      )}
    </div>
  );
};

export default IssueWriter;
