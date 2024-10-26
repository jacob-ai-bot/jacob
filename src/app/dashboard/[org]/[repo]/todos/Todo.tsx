"use client";

import React, { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { trpcClient } from "~/trpc/client";
import { type Todo } from "~/server/api/routers/events";
import LoadingIndicator from "../components/LoadingIndicator";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import TodoItem from "./components/TodoItem";
import IssueDetails from "./components/TodoDetails";
import EmptyTodoPlaceholder from "./components/EmptyTodoPlaceholder";

export interface Issue {
  title: string;
  body: string;
}

interface TodoProps {
  org: string;
  repo: string;
}

const Todo: React.FC<TodoProps> = ({ org, repo }) => {
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingIssue, setIsLoadingIssue] = useState(false);
  const [filteredTodos, setFilteredTodos] = useState<Todo[]>([]);
  const { data: project, isLoading: isLoadingProject } =
    api.events.getProject.useQuery({
      org,
      repo,
    });
  const {
    data: todos,
    isLoading: isLoadingTodos,
    refetch: refetchTodos,
  } = api.todos.getAll.useQuery(
    {
      projectId: project?.id ?? 0,
    },
    {
      enabled: !!project,
    },
  );

  // const { data: codebaseContext, isLoading: isLoadingCodebaseContext } =
  //   api.codebaseContext.getAll.useQuery({
  //     org,
  //     repo,
  //   });

  useEffect(() => {
    if (todos && todos.length > 0) {
      if (todos[0]) {
        setSelectedTodo(todos[0]);
      }
    }
  }, [todos]);

  useEffect(() => {
    const fetchIssue = async () => {
      if (selectedTodo?.issueId) {
        setIsLoadingIssue(true);
        try {
          console.log("Fetching issue", selectedTodo.issueId);
          const issue = await trpcClient.github.getIssue.query({
            issueId: selectedTodo.issueId,
            org,
            repo,
          });
          setSelectedIssue(issue);
        } catch (error) {
          console.error("Error fetching issue:", error);
        } finally {
          setIsLoadingIssue(false);
        }
      }
    };

    void fetchIssue();
  }, [selectedTodo, org, repo]);

  useEffect(() => {
    // Filter todos based on searchQuery
    const _filteredTodos =
      todos?.filter((todo) =>
        [todo.name, todo.description]
          .filter(Boolean)
          .some((field) =>
            field.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
      ) ?? [];
    console.log("filteredTodos", _filteredTodos);
    setFilteredTodos(_filteredTodos);
  }, [todos, searchQuery]);

  const handleArchive = (id: number) => {
    console.log("Archiving todo with id:", id);
    void refetchTodos();
  };

  const handleSelect = (id: number) => {
    console.log("Selecting todo with id:", id);
    const todo = todos?.find((todo) => todo.id === id);
    if (todo) {
      setSelectedTodo(todo);
    }
  };

  const handleTodoUpdate = (todo: Todo) => {
    console.log("Updating todo with id:", todo.id);
    void refetchTodos();
  };

  if (isLoadingProject || !project) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <LoadingIndicator />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-clip rounded-md  dark:bg-gray-900 lg:flex-row">
      {/* Left column: Todo list */}
      <div className="w-1/3 border-b border-gray-200 bg-white/80 dark:border-gray-700 dark:bg-gray-800 ">
        <div className="border-b border-r border-gray-200 p-4 dark:border-gray-700">
          <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
            Todo List
          </h1>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search todos"
              className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="hide-scrollbar h-[calc(100vh-239px)] overflow-y-scroll border-r border-gray-200 bg-white/80 dark:border-slate-900 dark:bg-neutral-800">
          {isLoadingTodos ? (
            <div className="py-4">
              <LoadingIndicator />
            </div>
          ) : filteredTodos.length === 0 ? (
            <EmptyTodoPlaceholder />
          ) : (
            filteredTodos.map((todo, index) => (
              <TodoItem
                key={todo.id}
                index={index}
                org={org}
                repo={repo}
                todo={todo}
                onArchive={handleArchive}
                onSelect={handleSelect}
                selected={selectedTodo?.id === todo.id}
              />
            ))
          )}
        </div>
      </div>

      {/* Details column: Selected todo details */}
      <div className=" hide-scrollbar h-[calc(100vh-116px)] w-2/3 overflow-y-scroll bg-white p-6 dark:bg-gray-800 ">
        {selectedTodo ? (
          <IssueDetails
            selectedTodo={selectedTodo}
            selectedIssue={selectedIssue}
            isLoadingIssue={isLoadingIssue}
            onTodoUpdate={handleTodoUpdate}
            org={org}
            repo={repo}
          />
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400">
            Select a todo to view details
          </p>
        )}
      </div>
    </div>
  );
};

export default Todo;
