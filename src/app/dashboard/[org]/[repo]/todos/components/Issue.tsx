import React, { useEffect } from "react";
import type Todo from "../Todo";
import { type Issue } from "../Todo";
import LoadingIndicator from "../../components/LoadingIndicator";
import { TodoStatus } from "~/server/db/enums";
import { api } from "~/trpc/react";
import { useState } from "react";
import MarkdownRenderer from "../../components/MarkdownRenderer";
import { toast } from "react-toastify";

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
  const [isEditingExit, setIsEditingExit] = useState(false);
  const [exitCriteria, setExitCriteria] = useState("[] Add exit criteria");

  useEffect(() => {
    setIssueTitle(selectedIssue?.title ?? "");
    setIssueBody(selectedIssue?.body ?? "");
  }, [selectedIssue]);

  const { mutateAsync: updateIssue } = api.github.updateIssue.useMutation();

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

  const handleSaveExitCriteria = () => {
    setIsEditingExit(false);
    toast.success("Exit criteria updated locally!");
  };

  const handleStartWork = async () => {
    const updatedBody = `${issueBody}\n\n${exitCriteria ? `Exit Criteria:\n${exitCriteria}\n\n` : ""}@jacob-ai-bot`;
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
        <div className="rounded-lg bg-gradient-to-b from-aurora-50/70 to-50% p-4 transition-all dark:from-blue-900/5 dark:to-transparent">
          <h3 className="mb-3 text-lg font-semibold text-blue-700 dark:text-blue-300">
            Issue
          </h3>
          {isEditingIssue ? (
            <>
              <input
                type="text"
                value={issueTitle}
                onChange={(e) => setIssueTitle(e.target.value)}
                className="mb-2 w-full rounded border p-2 dark:border-gray-600 dark:bg-gray-700"
              />
              <textarea
                value={issueBody}
                onChange={(e) => setIssueBody(e.target.value)}
                className="w-full rounded border p-2 dark:border-gray-600 dark:bg-gray-700"
              />
              <button
                onClick={handleSaveIssue}
                className="mt-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 dark:bg-blue-700 dark:hover:bg-blue-800"
              >
                Save
              </button>
            </>
          ) : (
            <>
              <div className="mb-2 flex items-center">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {issueTitle}
                </h3>
                <button
                  onClick={() => setIsEditingIssue(true)}
                  className="ml-2 text-sm text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-500"
                >
                  Edit
                </button>
              </div>
              <div className="markdown-chat">
                <MarkdownRenderer>{issueBody}</MarkdownRenderer>
              </div>
            </>
          )}
        </div>

        {/* Exit Criteria Section */}
        <div className="rounded-lg bg-gradient-to-b from-meadow-50/90 to-50% p-4 transition-all dark:from-meadow-900/5 dark:to-transparent">
          <h3 className="mb-3 text-lg font-semibold text-slate-700 dark:text-slate-300">
            Exit Criteria
          </h3>
          {isEditingExit ? (
            <>
              <textarea
                value={exitCriteria}
                onChange={(e) => setExitCriteria(e.target.value)}
                className="w-full rounded border p-2 dark:border-gray-600 dark:bg-gray-700"
              />
              <button
                onClick={handleSaveExitCriteria}
                className="mt-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 dark:bg-blue-700 dark:hover:bg-blue-800"
              >
                Save
              </button>
            </>
          ) : (
            <>
              <div className="mb-2 flex items-center">
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                  {exitCriteria || "No exit criteria set."}
                </h3>
                <button
                  onClick={() => setIsEditingExit(true)}
                  className="ml-2 text-sm text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-500"
                >
                  Edit
                </button>
              </div>
              <div className="markdown-chat">
                <MarkdownRenderer>{exitCriteria}</MarkdownRenderer>
              </div>
            </>
          )}
        </div>

        {/* Research Section */}
        <div className="rounded-lg bg-gradient-to-b from-sunset-50/70 to-50% p-4 transition-all dark:from-sunset-900/5 dark:to-transparent">
          <h3 className="mb-3 text-lg font-semibold text-slate-700 dark:text-slate-300">
            Research
          </h3>
          {isLoadingResearch ? (
            <LoadingIndicator />
          ) : (
            research?.map((item) => (
              <div className="markdown-chat" key={item.id}>
                <MarkdownRenderer>{item.answer}</MarkdownRenderer>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default Issue;
