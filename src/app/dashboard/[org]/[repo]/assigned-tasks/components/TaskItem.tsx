import React from "react";
import { type Task } from "~/server/api/routers/events";
import { formatDistanceToNow } from "date-fns";
import { ArrowRightCircleIcon } from "@heroicons/react/24/outline";
import { getTaskStatusColor, getTaskStatusLabel } from "~/app/utils";
import { toast } from "react-toastify";

interface TaskItemProps {
  task: Task;
  onSelect: () => void;
  selected: boolean;
  index: number;
  org: string;
  repo: string;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onSelect,
  selected,
  index,
  org,
  repo,
}) => {
  const getBackgroundColor = (index: number, selected: boolean) => {
    if (selected) {
      return "border-l-4 border-l-meadow-200 bg-meadow-50 hover:bg-meadow-50 dark:bg-sky-900/50 dark:hover:bg-slate-600/50";
    }
    return index % 2 === 0
      ? "bg-white/90 hover:bg-meadow-50/10 dark:bg-slate-700/50 dark:hover:bg-sky-900/20 border-l-0"
      : "bg-aurora-50/10 hover:bg-meadow-50/10 dark:bg-slate-600/50 dark:hover:bg-sky-900/20 border-l-0";
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Branch name copied to clipboard");
    } catch (err) {
      toast.error("Failed to copy branch name to clipboard");
    }
  };

  return (
    <div
      className={`relative cursor-pointer px-4 pb-2 pt-1 transition-all ${getBackgroundColor(
        index,
        selected,
      )}`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {task.name}
        </h3>
        <div className="flex items-center space-x-1">
          <span
            className={`overflow-hidden truncate whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ${getTaskStatusColor(
              task.status,
            )}`}
          >
            {getTaskStatusLabel(task.status)}
          </span>
        </div>
      </div>
      <p className="line-clamp-2 text-xs text-neutral-600 dark:text-neutral-400">
        {task.description}
      </p>
      <div className="mt-2 flex items-center justify-between text-xs">
        {task?.issue?.createdAt && (
          <span className="text-[8pt] text-neutral-400 dark:text-neutral-400">
            Created{" "}
            {formatDistanceToNow(new Date(task.issue?.createdAt), {
              addSuffix: true,
            })}
          </span>
        )}
        <div className="flex items-center space-x-4">
          {task.issueId && !task.pullRequest && (
            <a
              href={
                task.issue?.link ??
                `https://github.com/${org}/${repo}/issues/${task.issueId}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-aurora-600 hover:text-aurora-700 dark:text-slate-400 dark:hover:text-slate-300"
            >
              Issue #{task.issueId}
              <ArrowRightCircleIcon className="ml-1 h-4 w-4" />
            </a>
          )}
          {task.pullRequest?.branch && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                void copyToClipboard(task.pullRequest?.branch ?? "");
              }}
              className="flex items-center text-aurora-600 hover:text-aurora-700 dark:text-slate-400 dark:hover:text-slate-300"
            >
              {task.pullRequest.branch}
            </button>
          )}
          {task.pullRequest && (
            <a
              href={task.pullRequest.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-blossom-600 hover:text-blossom-700 dark:text-slate-400 dark:hover:text-slate-300"
            >
              PR #{task.pullRequest.pullRequestId}
              <ArrowRightCircleIcon className="ml-1 h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskItem;
