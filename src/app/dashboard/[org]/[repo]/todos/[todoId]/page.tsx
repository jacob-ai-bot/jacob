"use client";

import React, { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { trpcClient } from "~/trpc/client";
import { type Todo } from "~/server/api/routers/events";
import LoadingIndicator from "../../components/LoadingIndicator";
import TodoDetails from "../components/TodoDetails";
import type { Issue } from "../Todo";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

interface TodoDetailPageProps {
  params: {
    org: string;
    repo: string;
    todoId: string;
  };
}

export default function TodoDetailPage({ params }: TodoDetailPageProps) {
  const { org, repo, todoId } = params;
  const router = useRouter();
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [isLoadingIssue, setIsLoadingIssue] = useState(false);

  const { data: project } = api.events.getProject.useQuery({
    org,
    repo,
  });

  const {
    data: todo,
    isLoading: isLoadingTodo,
    refetch,
  } = api.todos.getById.useQuery(
    {
      id: parseInt(todoId),
    },
    {
      enabled: !!todoId,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      staleTime: 30000,
    },
  );

  useEffect(() => {
    const fetchIssue = async () => {
      if (todo?.issueId) {
        setIsLoadingIssue(true);
        try {
          const issue = await trpcClient.github.getIssue.query({
            issueId: todo.issueId,
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
  }, [todo, org, repo]);

  const handleTodoUpdate = (todo: Todo) => {
    console.log("handleTodoUpdate", todo);
    void refetch();
  };

  if (isLoadingTodo || !project) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <LoadingIndicator />
      </div>
    );
  }

  if (!todo) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-gray-500">Todo not found</p>
      </div>
    );
  }

  return (
    <div className="hide-scrollbar mx-auto h-screen w-full max-w-7xl overflow-y-scroll rounded-md bg-white p-6 dark:bg-gray-800 md:h-[calc(100vh-119px)]">
      <div className="md:mb-4">
        <button
          onClick={() => router.push(`/dashboard/${org}/${repo}/todos`)}
          className="inline-flex items-center space-x-2 rounded-md pb-1 text-sm text-sunset-600 hover:bg-sunset-50 hover:text-sunset-700 dark:text-purple-400 dark:hover:bg-purple-900/50 dark:hover:text-purple-300 md:px-3 md:py-2 md:pb-2"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          <span>Back to Todos</span>
        </button>
      </div>
      <TodoDetails
        selectedTodo={todo}
        selectedIssue={selectedIssue}
        isLoadingIssue={isLoadingIssue}
        onTodoUpdate={handleTodoUpdate}
        org={org}
        repo={repo}
      />
    </div>
  );
}
