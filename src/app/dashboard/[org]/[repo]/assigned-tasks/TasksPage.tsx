"use client";

import React, { useEffect, useState } from "react";
import Workspace from "./components/workspace";
import { SidebarIcon } from "~/types";
import { TaskStatus } from "~/server/db/enums";
import { type Task, type Event } from "~/server/api/routers/events";
import { api } from "~/trpc/react";
import LoadingIndicator from "../components/LoadingIndicator";
import TaskItem from "./components/TaskItem";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface TasksPageProps {
  org: string;
  repo: string;
}

const TasksPage: React.FC<TasksPageProps> = ({ org, repo }) => {
  const [selectedIcon, setSelectedIcon] = useState<SidebarIcon>(
    SidebarIcon.Code,
  );
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);

  const {
    data: tasks,
    isLoading: loadingTasks,
    refetch: refetchTasks,
  } = api.events.getTasks.useQuery({
    org,
    repo,
  });
  const { data: project, isLoading: loadingProject } =
    api.events.getProject.useQuery({ org, repo });

  const { data: taskEvents, refetch: refetchEvents } =
    api.events.getEventsByIssue.useQuery(
      { org, repo, issueId: selectedTask?.issueId ?? 0 },
      { enabled: !!selectedTask },
    );

  useEffect(() => {
    if (taskEvents) {
      setEvents(taskEvents);
    }
  }, [taskEvents]);

  useEffect(() => {
    if (tasks && tasks.length > 0) {
      setSelectedTask(tasks[0]);
    }
  }, [tasks]);

  useEffect(() => {
    if (tasks) {
      const filtered = tasks.filter(
        (task) =>
          task.name?.toLowerCase().includes(searchQuery.toLowerCase()) ??
          task.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      setFilteredTasks(filtered);
    }
  }, [tasks, searchQuery]);

  useEffect(() => {
    if (selectedTask) {
      void refetchEvents();
    }
  }, [selectedTask, refetchEvents]);

  api.events.onAdd.useSubscription(
    { org, repo },
    {
      onData(newEvent: Event) {
        if (selectedTask && newEvent.issueId === selectedTask.issueId) {
          setEvents((prevEvents) => [...prevEvents, newEvent]);
        }
        void refetchTasks();
      },
      onError(err) {
        console.error("Subscription error:", err);
      },
    },
  );

  if (loadingTasks || loadingProject || !tasks || !project) {
    return <LoadingIndicator />;
  }

  return (
    <div className="flex h-full w-full flex-col overflow-clip rounded-md dark:bg-gray-900 lg:flex-row">
      {/* Left column: Task list */}
      <div className="w-1/3 border-b border-gray-200 bg-white/80 dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-r border-gray-200 p-4 dark:border-gray-700">
          <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
            Assigned Tasks
          </h1>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks"
              className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="hide-scrollbar h-[calc(100vh-239px)] overflow-y-scroll border-r border-gray-200 bg-white/80 dark:border-slate-900 dark:bg-neutral-800">
          {filteredTasks.map((task, index) => (
            <TaskItem
              key={task.id}
              index={index}
              task={task}
              onSelect={() => setSelectedTask(task)}
              selected={selectedTask?.id === task.id}
              org={org}
              repo={repo}
            />
          ))}
        </div>
      </div>

      {/* Right column: Workspace */}

      <div className=" hide-scrollbar h-[calc(100vh-116px)] w-2/3 overflow-y-scroll bg-white dark:bg-gray-800 ">
        <Workspace
          tasks={tasks.filter(
            (t) =>
              t.status === TaskStatus.IN_PROGRESS ||
              t.status === TaskStatus.DONE,
          )}
          selectedIcon={selectedIcon}
          selectedTask={selectedTask}
          setSelectedIcon={setSelectedIcon}
          setSelectedTask={setSelectedTask}
          org={org}
          repo={repo}
          events={events}
        />
      </div>
    </div>
  );
};

export default TasksPage;
