import React, { useState } from "react";
import type Todo from "../Todo";
import { type Issue } from "../Todo";
import LoadingIndicator from "../../components/LoadingIndicator";
import { TodoStatus } from "~/server/db/enums";
import { api } from "~/trpc/react";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { getTodoLabel } from "~/app/utils";
import Research from "./Research";
import IssueComponent from "./Issue";
import Plan from "./Plan";
import QuestionsForUser from "./QuestionsForUser";
import { ResearchAgentActionType } from "~/server/agent/research";

interface TodoDetailsProps {
  selectedTodo: Todo;
  selectedIssue: Issue | null;
  isLoadingIssue: boolean;
  org: string;
  repo: string;
  onTodoUpdate: (todo: Todo) => void;
}

const TodoDetails: React.FC<TodoDetailsProps> = ({
  selectedTodo,
  selectedIssue,
  isLoadingIssue,
  onTodoUpdate,
  org,
  repo,
}) => {
  const { data: research, isLoading: isLoadingResearch } =
    api.events.getResearch.useQuery({
      todoId: selectedTodo.id,
      issueId: selectedTodo.issueId ?? 0,
    });

  const [isGeneratingResearch, setIsGeneratingResearch] = useState(false);
  const [isStartingWork, setIsStartingWork] = useState(false);
  const [runBuild, setRunBuild] = useState(false);

  const { mutateAsync: researchIssue } = api.todos.researchIssue.useMutation();
  const { mutateAsync: updateTodo } = api.todos.update.useMutation();
  const { mutateAsync: updateIssue } = api.github.updateIssue.useMutation();

  const handleResearchIssue = async () => {
    try {
      setIsGeneratingResearch(true);
      await researchIssue({
        repo,
        org,
        issueId: selectedTodo?.issueId ?? 0,
        todoId: selectedTodo.id,
        githubIssue: selectedIssue?.body ?? "",
      });
    } catch (error) {
      console.error("Error researching issue:", error);
      toast.error("Failed to research the issue.");
    } finally {
      setIsGeneratingResearch(false);
    }
  };

  const handleStartWork = async () => {
    setIsStartingWork(true);
    let updatedBody = `${selectedIssue?.body ?? ""}\n@jacob-ai-bot`;
    if (!runBuild) {
      updatedBody += " --skip-build";
    }
    try {
      await updateIssue({
        repo: `${org}/${repo}`,
        id: selectedTodo?.issueId ?? 0,
        title: selectedIssue?.title ?? "",
        body: updatedBody,
      });
      await updateTodo({
        id: selectedTodo.id,
        status: TodoStatus.IN_PROGRESS,
      });
      onTodoUpdate({
        ...selectedTodo,
        status: TodoStatus.IN_PROGRESS,
      });
      toast.success("Work started and issue updated!");
    } catch (error) {
      console.error("Error starting work:", error);
      toast.error("Failed to start work on the issue.");
    } finally {
      setIsStartingWork(false);
    }
  };

  if (isLoadingIssue) {
    return <LoadingIndicator />;
  }
  if (!selectedIssue || !selectedTodo) {
    return <div>No issue found</div>;
  }

  const userQuestions = research?.filter(
    (item) => item.type === ResearchAgentActionType.AskProjectOwner,
  );
  const otherResearch = research?.filter(
    (item) => item.type !== ResearchAgentActionType.AskProjectOwner,
  );

  return (
    <>
      <div className="mb-6 flex flex-row flex-nowrap items-center justify-between gap-4 overflow-clip">
        <div className="flex flex-row flex-nowrap items-center space-x-2">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            {selectedIssue.title}
          </h2>
          <div
            className={`inline-flex items-center text-center text-sm font-medium ${
              selectedTodo.status === TodoStatus.DONE
                ? "bg-aurora-100 text-aurora-800 dark:bg-aurora-800 dark:text-aurora-100"
                : selectedTodo.status === TodoStatus.IN_PROGRESS
                  ? "bg-meadow-100 text-meadow-800 dark:bg-meadow-800 dark:text-meadow-100"
                  : selectedTodo.status === TodoStatus.ERROR
                    ? "bg-error-100 text-error-800 dark:bg-error-800 dark:text-error-100"
                    : "bg-sunset-100 text-sunset-800 dark:bg-sunset-800 dark:text-sunset-100"
            } whitespace-nowrap rounded-full px-2 py-1`}
          >
            {getTodoLabel(selectedTodo.status)}
          </div>
        </div>
        <div className="flex flex-row items-center space-x-2">
          {selectedTodo.status === TodoStatus.TODO && (
            <div className="flex items-center space-x-4 ">
              <label className="flex items-center space-x-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={runBuild}
                  onChange={(e) => setRunBuild(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-sunset-600 focus:ring-sunset-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-purple-600"
                />
                <span>Run Build</span>
              </label>
              <button
                onClick={handleStartWork}
                disabled={isStartingWork}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-white ${
                  isStartingWork
                    ? "cursor-not-allowed bg-gray-400"
                    : "bg-sunset-500 hover:bg-sunset-600 dark:bg-purple-700 dark:hover:bg-purple-600"
                }`}
              >
                {isStartingWork ? "Starting Work..." : "Start Work"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-8">
        {/* Issue Section */}
        <IssueComponent
          org={org}
          repo={repo}
          issueId={selectedTodo.issueId ?? 0}
          initialTitle={selectedIssue.title}
          initialBody={selectedIssue.body}
        />

        {/* Questions for User Section */}
        {userQuestions && userQuestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-lg bg-gradient-to-b from-aurora-50/70 to-50% p-6 shadow-lg transition-all dark:from-aurora-800/30 dark:to-aurora-800/10"
          >
            <QuestionsForUser
              questions={userQuestions}
              todoId={selectedTodo.id}
              issueId={selectedTodo.issueId ?? 0}
            />
          </motion.div>
        )}

        {/* Plan Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-lg bg-gradient-to-b from-meadow-50/70 to-50% p-6 shadow-lg transition-all dark:from-meadow-800/30 dark:to-meadow-800/10"
        >
          <Plan
            projectId={selectedTodo.projectId}
            issueNumber={selectedTodo.issueId ?? 0}
          />
        </motion.div>

        {/* Research Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-lg bg-gradient-to-b from-sunset-50/70 to-50% p-6 shadow-lg transition-all dark:from-purple-800/30 dark:to-purple-800/10"
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-semibold text-sunset-700 dark:text-slate-300">
                Research
              </h3>
              <p className="text-sm text-sunset-900/80 dark:text-gray-400">
                {otherResearch?.length
                  ? "This research will be used to help JACoB complete the issue."
                  : "Generate a list of research questions to give JACoB more context about the issue."}
              </p>
            </div>
            {otherResearch?.length ? null : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleResearchIssue}
                disabled={isGeneratingResearch}
                className={`rounded-full px-6 py-2 text-white transition-colors ${
                  isGeneratingResearch
                    ? "cursor-not-allowed bg-gray-400 dark:bg-gray-600"
                    : "bg-sunset-500 hover:bg-sunset-600 dark:bg-purple-700 dark:hover:bg-purple-600"
                }`}
              >
                {isGeneratingResearch ? "Generating..." : "Generate Research"}
              </motion.button>
            )}
          </div>
          {isLoadingResearch ? (
            <LoadingIndicator />
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.1,
                  },
                },
              }}
              className="space-y-4"
            >
              {otherResearch?.map((item, index) => (
                <motion.div
                  key={item.id}
                  variants={{
                    hidden: { y: 20, opacity: 0 },
                    visible: { y: 0, opacity: 1 },
                  }}
                >
                  <Research
                    item={item}
                    isLastItem={index === otherResearch.length - 1}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>
    </>
  );
};

export default TodoDetails;
