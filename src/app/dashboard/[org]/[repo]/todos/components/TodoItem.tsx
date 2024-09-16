import React, { useState } from "react";
import { type Todo } from "~/server/api/routers/events";
import { TodoStatus } from "~/server/db/enums";
import { api } from "~/trpc/react";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowRightCircleIcon,
  ArchiveBoxIcon,
} from "@heroicons/react/24/outline";

interface TodoItemProps {
  org: string;
  repo: string;
  todo: Todo;
  onArchive: (todoId: number) => void;
  onSelect: (todoId: number) => void;
  selected: boolean;
  index: number;
}

export const TodoItem: React.FC<TodoItemProps> = ({
  org,
  repo,
  todo,
  onArchive,
  onSelect,
  selected,
  index,
}) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const statusColors = {
    [TodoStatus.TODO]:
      "bg-sunset-100 text-sunset-800 dark:bg-sunset-800 dark:text-sunset-100",
    [TodoStatus.IN_PROGRESS]:
      "bg-meadow-100 text-meadow-800 dark:bg-meadow-800 dark:text-meadow-100",
    [TodoStatus.DONE]:
      "bg-aurora-100 text-aurora-800 dark:bg-aurora-800 dark:text-aurora-100",
    [TodoStatus.ERROR]:
      "bg-error-100 text-error-800 dark:bg-error-800 dark:text-error-100",
  };

  const archiveMutation = api.todos.archive.useMutation();
  const [isArchiving, setIsArchiving] = useState(false);

  const handleArchiveClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setShowConfirmation(true);
  };

  const handleConfirmArchive = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsArchiving(true);
    archiveMutation.mutate(
      { id: todo.id },
      {
        onSuccess: () => {
          onArchive(todo.id);
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

  const getBackgroundColor = (index: number, selected: boolean) => {
    if (selected) {
      return "border-l-4  bg-meadow-50 hover:bg-meadow-50 dark:bg-sky-900/50 dark:hover:bg-slate-600/50";
    }
    return index % 2 === 0
      ? "bg-white/90 hover:bg-meadow-50/10 dark:bg-slate-700/50 dark:hover:bg-sky-900/20 border-l-0"
      : "bg-aurora-50/10 hover:bg-meadow-50/10 dark:bg-slate-600/50 dark:hover:bg-sky-900/20 border-l-0";
  };

  return (
    <div
      className={`relative cursor-pointer border-l-meadow-200 px-4 pb-2 pt-1 transition-all dark:border-l-purple-800/80  ${getBackgroundColor(index, selected)}`}
      onClick={() => onSelect(todo.id)}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {todo.name}
        </h3>
        <div className="flex items-center space-x-1">
          {(todo.status === TodoStatus.IN_PROGRESS ||
            todo.status === TodoStatus.DONE) && (
            <span
              className={`overflow-hidden truncate whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ${statusColors[todo.status as TodoStatus]}`}
            >
              {todo.status}
            </span>
          )}
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
        {todo.description}
      </p>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-[8pt] text-neutral-400 dark:text-neutral-400">
          Created{" "}
          {formatDistanceToNow(new Date(todo.createdAt), { addSuffix: true })}
        </span>
        {todo.issueId && (
          <a
            href={`https://github.com/${org}/${repo}/issues/${todo.issueId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-aurora-600 hover:text-aurora-700 dark:text-slate-400 dark:hover:text-slate-300"
          >
            Issue #{todo.issueId}
            <ArrowRightCircleIcon className="ml-1 h-4 w-4" />
          </a>
        )}
      </div>

      {showConfirmation && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="rounded-lg bg-white p-4 shadow-lg dark:bg-neutral-800">
            <p className="mb-4 text-sm text-neutral-700 dark:text-neutral-300">
              Are you sure you want to archive this todo?
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

export default TodoItem;
