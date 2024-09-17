import React, { useEffect, useRef, useState } from "react";
import type Todo from "../Todo";
import { type Issue } from "../Todo";
import LoadingIndicator from "../../components/LoadingIndicator";
import { TodoStatus } from "~/server/db/enums";
import { api } from "~/trpc/react";
import MarkdownRenderer from "../../components/MarkdownRenderer";
import { toast } from "react-toastify";
import { faEdit } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion, AnimatePresence } from "framer-motion";
import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";
import { getTodoLabel } from "~/app/utils";

interface IssueProps {
  selectedTodo: Todo;
  selectedIssue: Issue | null;
  isLoadingIssue: boolean;
  org: string;
  repo: string;
  onTodoUpdate: (todo: Todo) => void;
}

const ResearchItem: React.FC<{ item: any; isLastItem: boolean }> = ({
  item,
  isLastItem,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className={`mb-6 border-b border-sunset-200/50 pb-4 dark:border-gray-700/50 ${isLastItem ? "border-none" : ""}`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-left"
      >
        <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200">
          {item.question}
        </h4>
        <FontAwesomeIcon
          icon={isOpen ? faChevronUp : faChevronDown}
          className="ml-2 text-gray-500 transition-transform dark:text-gray-400"
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial="collapsed"
            animate="open"
            exit="collapsed"
            variants={{
              open: { opacity: 1, height: "auto", marginTop: 16 },
              collapsed: { opacity: 0, height: 0, marginTop: 0 },
            }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
          >
            <div className="markdown-chat ">
              <MarkdownRenderer>{item.answer}</MarkdownRenderer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Issue: React.FC<IssueProps> = ({
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

  const [isEditingIssue, setIsEditingIssue] = useState(false);
  const [issueTitle, setIssueTitle] = useState(selectedIssue?.title ?? "");
  const [issueBody, setIssueBody] = useState(selectedIssue?.body ?? "");
  const [isGeneratingResearch, setIsGeneratingResearch] = useState(false);
  const [isStartingWork, setIsStartingWork] = useState(false);

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
  const { mutateAsync: updateTodo } = api.todos.update.useMutation();

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
    setIsStartingWork(true);
    const updatedBody = `${issueBody}\n@jacob-ai-bot`;
    try {
      await updateIssue({
        repo: `${org}/${repo}`,
        id: selectedTodo?.issueId ?? 0,
        title: issueTitle,
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
      setIssueBody(updatedBody);
      toast.success("Work started and issue updated!");
    } catch (error) {
      console.error("Error starting work:", error);
      toast.error("Failed to start work on the issue.");
    } finally {
      setIsStartingWork(false);
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
                ? "bg-aurora-100 text-aurora-800 dark:bg-aurora-800 dark:text-aurora-100"
                : selectedTodo.status === TodoStatus.IN_PROGRESS
                  ? "bg-meadow-100 text-meadow-800 dark:bg-meadow-800 dark:text-meadow-100"
                  : selectedTodo.status === TodoStatus.ERROR
                    ? "bg-error-100 text-error-800 dark:bg-error-800 dark:text-error-100"
                    : "bg-sunset-100 text-sunset-800 dark:bg-sunset-800 dark:text-sunset-100"
            } rounded-full px-2 py-1`}
          >
            {getTodoLabel(selectedTodo.status)}
          </div>
        </div>
        {selectedTodo.status === TodoStatus.TODO && (
          <button
            onClick={handleStartWork}
            disabled={isStartingWork}
            className={`rounded-full px-4 py-2 text-white ${
              isStartingWork
                ? "cursor-not-allowed bg-gray-400"
                : "bg-sunset-500 hover:bg-sunset-600 dark:bg-purple-700 dark:hover:bg-purple-600"
            }`}
          >
            {isStartingWork ? "Starting Work..." : "Start Work"}
          </button>
        )}
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
                {research?.length
                  ? "This research will be used to help JACoB complete the issue."
                  : "Generate a list of research questions to give JACoB more context about the issue."}
              </p>
            </div>
            {research?.length ? null : (
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
              {research?.map((item, index) => (
                <motion.div
                  key={item.id}
                  variants={{
                    hidden: { y: 20, opacity: 0 },
                    visible: { y: 0, opacity: 1 },
                  }}
                >
                  <ResearchItem
                    item={item}
                    isLastItem={index === research.length - 1}
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

export default Issue;
