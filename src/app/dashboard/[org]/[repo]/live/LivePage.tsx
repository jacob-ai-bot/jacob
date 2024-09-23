"use client";

import React, { useEffect, useRef, useState } from "react";

import Workspace from "./components/workspace";
import { type Message, Role, SidebarIcon } from "~/types";
import { TaskStatus } from "~/server/db/enums";

import { type Todo, type Task } from "~/server/api/routers/events";
import { api } from "~/trpc/react";
import { trpcClient } from "~/trpc/client";
import { TaskType } from "~/server/db/enums";
import { getSidebarIconForType } from "~/app/utils";
import { toast } from "react-toastify";
import { getPlanForTaskSubType } from "~/app/utils";
import { type Project } from "~/server/db/tables/projects.table";
import LoadingIndicator from "../components/LoadingIndicator";

interface LivePageProps {
  org: string;
  repo: string;
}

export const LivePage: React.FC<LivePageProps> = ({ org, repo }) => {
  const [selectedIcon, setSelectedIcon] = useState<SidebarIcon>(
    SidebarIcon.Plan,
  );
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);

  const {
    data: tasks,
    isLoading: loadingTasks,
    refetch: refetchTasks,
  } = api.events.getTasks.useQuery({ org, repo });
  const { data: project, isLoading: loadingProject } =
    api.events.getProject.useQuery({ org, repo });

  const archiveTodo = api.todos.archive.useMutation();

  useEffect(() => {
    if (tasks && project) {
      setSelectedTask(tasks[0]);
    }
  }, [tasks, project]);

  api.events.onAdd.useSubscription(
    { org, repo },
    {
      onData(event) {
        void refetchTasks();
      },
      onError(err) {
        console.error("Subscription error:", err);
      },
    },
  );

  const onRemoveTask = (todoId: number) => {
    console.log("Removing todo: ", todoId);
    archiveTodo.mutate({ id: todoId });
  };

  if (loadingTasks || loadingProject || !tasks || !project) {
    return <LoadingIndicator />;
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 text-white">
      <Workspace
        tasks={
          tasks?.filter(
            (t) =>
              t.status === TaskStatus.IN_PROGRESS ||
              t.status === TaskStatus.DONE,
          ) ?? []
        }
        selectedIcon={selectedIcon}
        selectedTask={selectedTask}
        setSelectedIcon={setSelectedIcon}
        setSelectedTask={setSelectedTask}
        onRemoveTask={onRemoveTask}
      />
    </div>
  );
};

export default LivePage;
