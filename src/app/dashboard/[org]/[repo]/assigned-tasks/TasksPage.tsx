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
import StepNavigation from "./components/StepNavigation";
import { Switch } from "@headlessui/react";
import TaskHeader from "./components/TaskHeader";
import FeedbackInput from "./components/FeedbackInput";
import AddPlanStepModal from "./components/AddPlanStepModal";

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
  const [currentEventIndex, setCurrentEventIndex] = useState<number>(0);
  const [liveUpdatesEnabled, setLiveUpdatesEnabled] = useState<boolean>(true);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [feedback, setFeedback] = useState<string>("");
  const [isAddPlanStepModalOpen, setIsAddPlanStepModalOpen] = useState(false);

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
      setCurrentEventIndex(taskEvents.length - 1);
    }
  }, [taskEvents]);

  useEffect(() => {
    if (taskEvents) {
      setEvents(taskEvents?.slice(0, currentEventIndex + 1) ?? []);
    }
  }, [currentEventIndex, taskEvents]);

  useEffect(() => {
    if (tasks && tasks.length > 0) {
      setSelectedTask(tasks[0]);
    }
  }, [tasks]);

  useEffect(() => {
    if (tasks) {
      let filtered = tasks;

      // Apply status filter if not showing all tasks
      if (!showAllTasks) {
        filtered = filtered.filter((task) => task.status !== TaskStatus.CLOSED);
      }

      // Apply search filter
      filtered = filtered.filter(
        (task) =>
          task.name?.toLowerCase().includes(searchQuery.toLowerCase()) ??
          task.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      );

      setFilteredTasks(filtered);

      // If filtered tasks are empty but there are tasks, show all tasks
      if (filtered.length === 0 && tasks.length > 0 && !showAllTasks) {
        setShowAllTasks(true);
      }
    }
  }, [tasks, searchQuery, showAllTasks]);

  useEffect(() => {
    if (selectedTask) {
      void refetchEvents();
    }
  }, [selectedTask, refetchEvents]);

  api.events.onAdd.useSubscription(
    { org, repo },
    {
      enabled: liveUpdatesEnabled,
      onData(newEvent: Event) {
        if (selectedTask && newEvent.issueId === selectedTask.issueId) {
          setEvents((prevEvents) => [...prevEvents, newEvent]);
          setCurrentEventIndex((prevIndex) => prevIndex + 1);
        }
        void refetchTasks();
      },
      onError(err) {
        console.error("Subscription error:", err);
      },
    },
  );

  const handleRestart = () => setCurrentEventIndex(0);
  const handleStepBackward = () =>
    setCurrentEventIndex((prev) => Math.max(0, prev - 1));
  const handleStepForward = () =>
    setCurrentEventIndex((prev) =>
      Math.min((taskEvents?.length ?? 1) - 1, prev + 1),
    );
  const handleJumpToEnd = () =>
    setCurrentEventIndex((taskEvents?.length ?? 1) - 1);

  const handleToggleLiveUpdates = () => {
    setLiveUpdatesEnabled((prev) => !prev);
  };

  const handleRefresh = async () => {
    try {
      await refetchEvents();
      await refetchTasks();
    } catch (error) {
      console.error("Failed to refresh events:", error);
    }
  };

  const handleRedoPlan = async () => {
    try {
      await api.planSteps.regeneratePlan.mutateAsync({
        org,
        repo,
        feedback,
      });
      await refetchTasks();
      setFeedback("");
    } catch (error) {
      console.error("Failed to redo plan:", error);
    }
  };

  const handleAddPlanStep = () => {
    setIsAddPlanStepModalOpen(true);
  };

  if (loadingTasks || loadingProject || !tasks || !project) {
    return <LoadingIndicator />;
  }

  return (
    <div className="flex h-full w-full flex-col overflow-clip rounded-md dark:bg-gray-900 lg:flex-row">
      <div className="w-1/3 border-b border-gray-200 bg-white/80 dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-r border-gray-200 p-4 dark:border-gray-700">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Assigned Tasks
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Show all tasks
              </span>
              <Switch
                checked={showAllTasks}
                onChange={setShowAllTasks}
                className={`${
                  showAllTasks
                    ? "bg-aurora-800/80"
                    : "bg-slate-200 dark:bg-slate-700"
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              >
                <span
                  className={`${
                    showAllTasks ? "translate-x-6" : "translate-x-1"
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </Switch>
            </div>
          </div>
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

      <div className="h-[calc(100vh-117px)] w-2/3 bg-white dark:bg-gray-800 ">
        <TaskHeader selectedTask={selectedTask} />
        <Workspace
          selectedIcon={selectedIcon}
          selectedTask={selectedTask}
          setSelectedIcon={setSelectedIcon}
          setSelectedTask={setSelectedTask}
          org={org}
          repo={repo}
          events={events}
          currentEventIndex={currentEventIndex}
        />
        <div className="p-4">
          <FeedbackInput feedback={feedback} setFeedback={setFeedback} />
          <button
            onClick={handleRedoPlan}
            className="mt-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Redo Plan
          </button>
          <button
            onClick={handleAddPlanStep}
            className="ml-2 mt-4 rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
          >
            Add Plan Step
          </button>
        </div>
        <div className="sticky bottom-0 flex  h-12 w-full justify-center bg-white dark:bg-gray-800">
          <StepNavigation
            onRestart={handleRestart}
            onStepBackward={handleStepBackward}
            onStepForward={handleStepForward}
            onJumpToEnd={handleJumpToEnd}
            currentIndex={currentEventIndex}
            totalSteps={taskEvents?.length ?? 0}
            liveUpdatesEnabled={liveUpdatesEnabled}
            onToggleLiveUpdates={handleToggleLiveUpdates}
            onRefresh={handleRefresh}
          />
        </div>
      </div>
      <AddPlanStepModal
        isOpen={isAddPlanStepModalOpen}
        onClose={() => setIsAddPlanStepModalOpen(false)}
        org={org}
        repo={repo}
      />
    </div>
  );
};

export default TasksPage;
