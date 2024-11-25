"use client";

import React, { useState } from "react";
import { TodoItem } from "../../todos/components/TodoItem";
import { api } from "~/trpc/react";
import { TodoStatus } from "~/server/db/enums";
import { type Todo } from "~/server/api/routers/events";

interface KanbanBoardProps {
  org: string;
  repo: string;
}

export function KanbanBoard({ org, repo }: KanbanBoardProps) {
  const [selectedTodoId, setSelectedTodoId] = useState<number | null>(null);
  const { data: todos = [], refetch } = api.todos.getAll.useQuery();
  const updateMutation = api.todos.update.useMutation({
    onSuccess: () => refetch(),
  });

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = async (
    e: React.DragEvent<HTMLDivElement>,
    status: TodoStatus,
  ) => {
    e.preventDefault();
    const todoData = e.dataTransfer.getData("text/plain");
    if (!todoData) return;

    const todo = JSON.parse(todoData) as Todo;
    if (todo.status !== status) {
      await updateMutation.mutateAsync({
        id: todo.id,
        status,
      });
    }
  };

  const todosByStatus = {
    [TodoStatus.TODO]: todos.filter((todo) => todo.status === TodoStatus.TODO),
    [TodoStatus.IN_PROGRESS]: todos.filter(
      (todo) => todo.status === TodoStatus.IN_PROGRESS,
    ),
    [TodoStatus.DONE]: todos.filter((todo) => todo.status === TodoStatus.DONE),
  };

  const handleArchive = (todoId: number) => {
    refetch();
  };

  return (
    <div className="flex h-[500px] gap-4 overflow-x-auto">
      {Object.entries(todosByStatus).map(([status, statusTodos]) => (
        <div
          key={status}
          className="flex h-full w-80 flex-none flex-col rounded-lg bg-white/80 p-4 shadow-sm dark:bg-slate-700/80"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, status as TodoStatus)}
        >
          <h3 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {status === TodoStatus.TODO
              ? "To Do"
              : status === TodoStatus.IN_PROGRESS
                ? "In Progress"
                : "Done"}
            <span className="ml-2 rounded-full bg-neutral-100 px-2 py-1 text-xs dark:bg-neutral-600">
              {statusTodos.length}
            </span>
          </h3>
          <div className="hide-scrollbar flex-1 space-y-2 overflow-y-auto">
            {statusTodos.map((todo, index) => (
              <TodoItem
                key={todo.id}
                org={org}
                repo={repo}
                todo={todo}
                onArchive={handleArchive}
                onSelect={setSelectedTodoId}
                selected={todo.id === selectedTodoId}
                index={index}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
