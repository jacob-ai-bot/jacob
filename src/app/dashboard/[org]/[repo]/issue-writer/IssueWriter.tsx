"use client";

import React, { useState, useRef, useEffect } from "react";
import { api } from "~/trpc/react";
import { trpcClient } from "~/trpc/client";
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
import ExtractedIssueDetails from "./components/ExtractedIssueDetails";
import SpeechToTextArea, {
  type SpeechToTextAreaRef,
} from "../components/SpeechToTextArea";
import { useSearchParams } from "next/navigation";
import { EvaluationMode } from "~/types";
import Link from "next/link";

interface IssueWriterProps {
  org: string;
  repo: string;
}

const TEXTAREA_MIN_HEIGHT = "600px";

const IssueWriter: React.FC<IssueWriterProps> = ({ org, repo }) => {
  const [issueTitle, setIssueTitle] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`issueTitle-${org}-${repo}`) ?? "";
    }
    return "";
  });
  const [issueBody, setIssueBody] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`issueBody-${org}-${repo}`) ?? "";
    }
    return "";
  });
  const [isEditing, setIsEditing] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createdIssueNumber, setCreatedIssueNumber] = useState<number | null>(
    null,
  );
  const [createdTodoId, setCreatedTodoId] = useState<number | null>(null);
  const [isLoadingCreatedIssue, setIsLoadingCreatedIssue] = useState(false);
  const [createdIssue, setCreatedIssue] = useState<{
    title: string;
    body: string;
  } | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [titleError, setTitleError] = useState(false);

  const [rewrittenIssue, setRewrittenIssue] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [evaluationMode, setEvaluationMode] = useState<EvaluationMode>(() => {
    if (typeof window !== "undefined") {
      return (
        (localStorage.getItem(
          `evaluationMode-${org}-${repo}`,
        ) as EvaluationMode) ?? EvaluationMode.DETAILED
      );
    }
    return EvaluationMode.DETAILED;
  });

  const titleInputRef = useRef<HTMLInputElement>(null);
  const speechToTextRef = useRef<SpeechToTextAreaRef>(null);

  const searchParams = useSearchParams();
  const filePath = searchParams.get("file_path");

  const { data: project, isLoading: isLoadingProject } =
    api.events.getProject.useQuery({
      org,
      repo,
    });
  const createIssueMutation = api.github.createIssue.useMutation();
  const rewriteIssueMutation = api.github.rewriteIssue.useMutation();
  const getByIssueIdQuery = api.todos.getByIssueId.useQuery(
    { issueId: createdIssueNumber ?? 0 },
    { enabled: !!createdIssueNumber },
  );

  useEffect(() => {
    if (isEditing) {
      speechToTextRef.current?.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    if (filePath) {
      const decodedFilePath = decodeURIComponent(filePath);
      const fileName = decodedFilePath.split("/").pop() ?? "";
      setIssueTitle(`Update ${fileName}`);
      setIssueBody(`## Update Required for ${decodedFilePath}

Please update the \`${fileName}\` file to address the following:

- **Description**: [Provide a detailed description of the required update.]
- **Reason**: [Explain why this update is necessary.]
- **Additional Notes**: [Any other relevant information.]`);
    }
  }, [filePath]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`issueTitle-${org}-${repo}`, issueTitle);
    }
  }, [issueTitle, org, repo]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`issueBody-${org}-${repo}`, issueBody);
    }
  }, [issueBody, org, repo]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`evaluationMode-${org}-${repo}`, evaluationMode);
    }
  }, [evaluationMode, org, repo]);

  useEffect(() => {
    if (createdIssueNumber && getByIssueIdQuery.data) {
      setCreatedTodoId(getByIssueIdQuery.data.id);
    }
  }, [createdIssueNumber, getByIssueIdQuery.data]);

  const handleCreateIssue = async () => {
    if (!issueTitle.trim()) {
      toast.error(
        "Error: Issue title is required. Please add a title to proceed.",
      );
      setTitleError(true);
      titleInputRef.current?.focus();
      return;
    }

    if (!issueBody.trim()) {
      toast.error("Please provide a body for the issue.");
      return;
    }

    setIsCreating(true);
    try {
      const result = await createIssueMutation.mutateAsync({
        repo: `${org}/${repo}`,
        title: issueTitle ?? "",
        body: issueBody,
      });

      setCreatedIssueNumber(result.number);
      setIsLoadingCreatedIssue(true);
      const createdIssue = await trpcClient.github.getIssue.query({
        org,
        repo,
        issueId: result.number,
      });
      setCreatedIssue(createdIssue);
      setIsLoadingCreatedIssue(false);
      toast.success("Issue created successfully!");
      setIsEditing(false);
      setRewrittenIssue(null);
      setFeedback(null);

      if (typeof window !== "undefined") {
        localStorage.removeItem(`issueTitle-${org}-${repo}`);
        localStorage.removeItem(`issueBody-${org}-${repo}`);
      }
      setIssueTitle("");
      setIssueBody("");
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
    setCreatedTodoId(null);
    setIsEditing(true);
    setTitleError(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem(`issueTitle-${org}-${repo}`);
      localStorage.removeItem(`issueBody-${org}-${repo}`);
    }
  };

  const handleEvaluateIssue = async (
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault();
    if (!issueBody) {
      toast.error("Please provide a body for the issue.");
      return;
    }

    setIsEvaluating(true);
    try {
      const rewrittenIssueResult = await rewriteIssueMutation.mutateAsync({
        org,
        repo,
        title: issueTitle,
        body: issueBody,
        evaluationMode,
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

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIssueTitle(e.target.value);
    setTitleError(false);
  };

  const handleEvaluationModeChange = (event: {
    target: { value: EvaluationMode };
  }) => {
    setEvaluationMode(event.target.value);
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
      className={`hide-scrollbar mx-auto flex h-full w-full flex-row space-x-4 overflow-hidden ${
        rewrittenIssue ? "max-w-[100rem]" : "max-w-4xl"
      }`}
    >
      <div
        className={`hide-scrollbar h-[calc(100vh-119px)] flex-1 overflow-hidden overflow-y-scroll rounded-md bg-white/50 p-4 pb-8 shadow-sm dark:bg-slate-800`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-aurora-700 dark:text-aurora-300">
            Issue Creator
          </h2>
          <div className="flex space-x-2">
            {!isEditing && createdTodoId && (
              <Link
                href={`/dashboard/${org}/${repo}/todos/${createdTodoId}`}
                className="rounded-full bg-blossom-500 px-4 py-2 text-white transition-colors hover:bg-blossom-700 dark:bg-blossom-600 dark:hover:bg-blossom-500"
              >
                View Issue
              </Link>
            )}
            <button
              onClick={handleNewIssue}
              className="rounded-full bg-sunset-400 px-4 py-2 text-white transition-colors hover:bg-sunset-500 dark:bg-sunset-600 dark:hover:bg-sunset-500"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              {isEditing ? "Clear Issue" : "New Issue"}
            </button>
          </div>
        </div>
        {isEditing ? (
          <div className="flex w-full flex-1 flex-col space-y-4">
            <input
              ref={titleInputRef}
              type="text"
              value={issueTitle}
              onChange={handleTitleChange}
              className={`w-full rounded-md border p-2 text-lg font-semibold focus:outline-none focus:ring-2 ${
                titleError
                  ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                  : "border-gray-300 focus:border-aurora-400 focus:ring-aurora-200"
              } dark:border-gray-600 dark:bg-gray-800 dark:focus:border-aurora-400 dark:focus:ring-aurora-800`}
              placeholder="Issue Title"
            />
            <div className="flex-1">
              <SpeechToTextArea
                ref={speechToTextRef}
                value={issueBody}
                onChange={(e) => setIssueBody(e.target.value)}
                minHeight={TEXTAREA_MIN_HEIGHT}
                placeholder="Describe the issue..."
                isLoading={isCreating || isEvaluating}
                shouldSubmitOnEnter={false}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative inline-flex items-center">
                  <div
                    className="relative h-6 w-11 cursor-pointer rounded-full transition-colors duration-300 ease-in-out"
                    style={{
                      backgroundColor:
                        evaluationMode === EvaluationMode.DETAILED
                          ? "#00C8FF"
                          : "#E5E7EB",
                    }}
                    onClick={() =>
                      handleEvaluationModeChange({
                        target: {
                          value:
                            evaluationMode === EvaluationMode.DETAILED
                              ? EvaluationMode.FASTER
                              : EvaluationMode.DETAILED,
                        },
                      })
                    }
                  >
                    <div
                      className={`absolute left-0.5 top-0.5 h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out ${
                        evaluationMode === EvaluationMode.DETAILED
                          ? "translate-x-5"
                          : "translate-x-0"
                      }`}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {evaluationMode === EvaluationMode.DETAILED
                    ? "Detailed Evaluation"
                    : "Faster Evaluation"}
                </span>
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
          </div>
        ) : createdIssue ? (
          <div className="hide-scrollbar h-full space-y-4 overflow-hidden overflow-y-scroll rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-col items-start justify-between space-y-2 sm:flex-row sm:items-center sm:space-y-0">
              <div className="flex items-center space-x-4">
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
      {rewrittenIssue && (
        <div className="h-full w-1/2 pb-1">
          <ExtractedIssueDetails
            feedback={feedback}
            rewrittenIssue={rewrittenIssue}
            onUpdateIssue={handleUpdateIssue}
            isEvaluating={isEvaluating}
          />
        </div>
      )}
    </div>
  );
};

export default IssueWriter;
