import React, { useEffect, useRef } from "react";
import type Todo from "../Todo";
import { type Issue } from "../Todo";
import LoadingIndicator from "../../components/LoadingIndicator";
import { TodoStatus } from "~/server/db/enums";
import { api } from "~/trpc/react";
import { useState } from "react";
import MarkdownRenderer from "../../components/MarkdownRenderer";
import { toast } from "react-toastify";
import { faEdit, faSave, faX } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface IssueProps {
  selectedTodo: Todo;
  selectedIssue: Issue | null;
  isLoadingIssue: boolean;
  org: string;
  repo: string;
}

const Issue: React.FC<IssueProps> = ({
  selectedTodo,
  selectedIssue,
  isLoadingIssue,
  org,
  repo,
}) => {
  console.log("selectedIssue", selectedIssue);
  const { data: research, isLoading: isLoadingResearch } =
    api.events.getResearch.useQuery({
      todoId: selectedTodo.id,
      issueId: selectedTodo.issueId ?? 0,
    });

  const [isEditingIssue, setIsEditingIssue] = useState(false);
  const [issueTitle, setIssueTitle] = useState(selectedIssue?.title ?? "");
  const [issueBody, setIssueBody] = useState(selectedIssue?.body ?? "");
  const [isGeneratingResearch, setIsGeneratingResearch] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setIssueTitle(selectedIssue?.title ?? "");
    setIssueBody(selectedIssue?.body ?? "");
  }, [selectedIssue]);

  useEffect(() => {
    if (isEditingIssue) {
      titleInputRef.current?.focus();
    }
  }, [isEditingIssue]);

  const { mutateAsync: updateIssue } = api.github.updateIssue.useMutation();
  const { mutateAsync: researchIssue } = api.todos.researchIssue.useMutation();

  const handleSaveIssue = async () => {
    try {
      await updateIssue({
        repo: `${org}/${repo}`,
        id: selectedTodo?.issueId ?? 0,
        title: issueTitle,
        body: issueBody,
      });
      setIsEditingIssue(false);
      toast.success("Issue updated successfully!");
    } catch (error) {
      console.error("Error updating issue:", error);
      toast.error("Failed to update the issue.");
    }
  };

  const handleResearchIssue = async () => {
    try {
      setIsGeneratingResearch(true);
      await researchIssue({
        repo,
        org,
        issueId: selectedTodo?.issueId ?? 0,
        todoId: selectedTodo.id,
        githubIssue: issueBody,
      });
    } catch (error) {
      console.error("Error researching issue:", error);
      toast.error("Failed to research the issue.");
    } finally {
      setIsGeneratingResearch(false);
    }
  };

  const handleStartWork = async () => {
    const updatedBody = `${issueBody}\n@jacob-ai-bot`;
    try {
      await updateIssue({
        repo: `${org}/${repo}`,
        id: selectedTodo?.issueId ?? 0,
        title: issueTitle,
        body: updatedBody,
      });
      setIssueBody(updatedBody);
      toast.success("Work started and issue updated!");
    } catch (error) {
      console.error("Error starting work:", error);
      toast.error("Failed to start work on the issue.");
    }
  };

  const handleCancelEdit = () => {
    setIsEditingIssue(false);
    setIssueTitle(selectedIssue?.title ?? "");
    setIssueBody(selectedIssue?.body ?? "");
  };

  if (isLoadingIssue) {
    return <LoadingIndicator />;
  }
  if (!selectedIssue || !selectedTodo) {
    return <div>No issue found</div>;
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between overflow-clip">
        <div className="flex flex-row space-x-2">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            {issueTitle}
          </h2>
          <div
            className={`text-center text-sm font-medium ${
              selectedTodo.status === TodoStatus.DONE
                ? "rounded-full bg-green-500 px-2 py-1 text-green-600 dark:bg-green-700 dark:text-green-400"
                : selectedTodo.status === TodoStatus.IN_PROGRESS
                  ? "rounded-full bg-yellow-500 px-2 py-1 text-yellow-600 dark:bg-yellow-700 dark:text-yellow-400"
                  : "rounded-full bg-gray-200 px-2 py-1 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
            }`}
          >
            {selectedTodo.status}
          </div>
        </div>
        <button
          onClick={handleStartWork}
          className="rounded-full bg-sunset-500 px-4 py-2 text-white dark:bg-purple-700"
        >
          Start Work
        </button>
      </div>

      <div className="space-y-8">
        {/* Issue Section */}
        <div className="rounded-lg bg-gradient-to-b from-aurora-50/70 to-50% p-6 shadow-md transition-all dark:from-aurora-800/80 dark:to-aurora-800/20 dark:shadow-blueGray-800/80">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-aurora-700 dark:text-blueGray-300">
              Issue
            </h3>
            {!isEditingIssue && (
              <button
                onClick={() => setIsEditingIssue(true)}
                className="text-xl text-aurora-600 transition-colors hover:text-aurora-700 dark:text-blueGray-300 dark:hover:text-blueGray-200 "
              >
                <FontAwesomeIcon icon={faEdit} className="mr-1" />
              </button>
            )}
          </div>
          {isEditingIssue ? (
            <div className="space-y-4">
              <input
                ref={titleInputRef}
                type="text"
                value={issueTitle}
                onChange={(e) => setIssueTitle(e.target.value)}
                className="w-full rounded-md border border-gray-300 p-2 text-lg font-semibold  focus:outline-none focus:ring-0  dark:border-gray-600 dark:bg-gray-800 dark:focus:border-blue-400 dark:focus:ring-blue-800"
                placeholder="Issue Title"
              />
              <textarea
                ref={bodyTextareaRef}
                value={issueBody}
                onChange={(e) => setIssueBody(e.target.value)}
                className="h-96 w-full rounded-md border border-gray-300 p-3 focus:outline-none focus:ring-0  dark:border-gray-600 dark:bg-gray-800 dark:focus:border-blue-400 dark:focus:ring-blue-800"
                placeholder="Describe the issue..."
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={handleCancelEdit}
                  className="flex items-center rounded-md bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveIssue}
                  className="flex items-center rounded-md bg-aurora-500 px-4 py-2 text-white transition-colors hover:bg-aurora-600 dark:bg-aurora-800/80 dark:hover:bg-aurora-700/80"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              <h4 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                {issueTitle}
              </h4>
              <div className="markdown-chat prose dark:prose-invert">
                <MarkdownRenderer>{issueBody}</MarkdownRenderer>
              </div>
            </>
          )}
        </div>

        {/* Research Section */}
        <div className="rounded-lg bg-gradient-to-b from-sunset-50/70 to-50% p-4 transition-all dark:from-purple-800/30 dark:to-purple-800/10 ">
          <div className="flex items-center justify-between">
            <h3 className=" text-lg font-semibold  text-sunset-700 dark:text-slate-300 ">
              Research
            </h3>
            <button
              onClick={handleResearchIssue}
              className="text-xl text-aurora-600 transition-colors hover:text-aurora-700 dark:text-blueGray-300 dark:hover:text-blueGray-200 "
            >
              {isGeneratingResearch ? "Generating..." : "Generate Research"}
            </button>
          </div>
          {isLoadingResearch ? (
            <LoadingIndicator />
          ) : (
            research?.map((item) => (
              <div
                key={item.id}
                className="my-4 flex flex-col items-start justify-between"
              >
                <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                  {item.question}
                </h4>
                <hr className="my-4 w-full border-t border-sunset-800/20 dark:border-gray-600" />
                <div className="markdown-chat" key={item.id}>
                  <MarkdownRenderer>{item.answer}</MarkdownRenderer>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default Issue;
