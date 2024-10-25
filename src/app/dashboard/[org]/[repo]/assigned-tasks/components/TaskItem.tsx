import React, { useState } from "react";
import { type Task } from "~/server/api/routers/events";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowRightCircleIcon,
  ArchiveBoxIcon,
} from "@heroicons/react/24/outline";
import { getTaskStatusColor, getTaskStatusLabel } from "~/app/utils";
import { api } from "~/utils/api";

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
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const archiveMutation = api.todos.archive.useMutation();

  const getBackgroundColor = (index: number, selected: boolean) => {
    if (selected) {
      return "border-l-4 border-l-meadow-200 bg-meadow-50 hover:bg-meadow-50 dark:bg-sky-900/50 dark:hover:bg-slate-600/50";
    }
    return index % 2 === 0
      ? "bg-white/90 hover:bg-meadow-50/10 dark:bg-slate-700/50 dark:hover:bg-sky-900/20 border-l-0"
      : "bg-aurora-50/10 hover:bg-meadow-50/10 dark:bg-slate-600/50 dark:hover:bg-sky-900/20 border-l-0";
  };

  const handleArchiveClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setShowConfirmation(true);
  };

  const handleConfirmArchive = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsArchiving(true);
    archiveMutation.mutate(
      { id: task.id },
      {
        onSuccess: () => {
          setShowConfirmation(false);
        },
        onSettled: () => {
          setIsArchiving(false);
        },
      },
    );
  };

  const handleCancelArchive = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setShowConfirmation(false);
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
        <h3 className="truncate pr-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {task.name}
        </h3>
        <div className="flex items-center space-x-2">
          <span
            className={`overflow-hidden truncate whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ${getTaskStatusColor(
              task.status,
            )}`}
          >
            {getTaskStatusLabel(task.status)}
          </span>
          <button
            onClick={handleArchiveClick}
            disabled={isArchiving}
            className="rounded-full p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:text-neutral-500 dark:hover:bg-neutral-700 dark:hover:text-neutral-300"
            title="Archive"
          >
            <ArchiveBoxIcon className="h-5 w-5" />
          </button>
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
              href={`https://github.com/${org}/${repo}/issues/${task.issueId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-aurora-600 hover:text-aurora-700 dark:text-slate-400 dark:hover:text-slate-300"
            >
              Issue #{task.issueId}
              <ArrowRightCircleIcon className="ml-1 h-4 w-4" />
            </a>
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
      {showConfirmation && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="rounded-lg bg-white p-4 shadow-lg dark:bg-neutral-800">
            <p className="mb-4 text-sm text-neutral-700 dark:text-neutral-300">
              Are you sure you want to archive this task?
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={handleCancelArchive}
                className="rounded px-3 py-1 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmArchive}
                className="rounded bg-sunset-500 px-3 py-1 text-sm text-white hover:bg-sunset-600"
              >
                {isArchiving ? "Archiving..." : "Archive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskItem;
