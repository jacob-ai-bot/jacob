"use client";

import React, { useEffect, useRef, useState } from "react";
import ChatComponent, { type ChatComponentHandle } from "./components/chat";
import ChatHeader from "./components/chat/ChatHeader";

import Workspace from "./components/workspace";
import { type Message, Role, SidebarIcon } from "~/types";
import { TaskStatus } from "~/server/db/enums";

import { type Todo, type Task } from "~/server/api/routers/events";
import { api } from "~/trpc/react";
import { trpcClient } from "~/trpc/client";
import { DEVELOPERS } from "~/data/developers";
import { TaskType } from "~/server/db/enums";
import { getSidebarIconForType } from "~/app/utils";
import Todos from "./components/todos";
import { toast } from "react-toastify";
import { getPlanForTaskSubType } from "~/app/utils";
import { type Project } from "~/server/db/tables/projects.table";
const CREATE_ISSUE_PROMPT =
  "Looks like our task queue is empty. What do you need to get done next? Give me a quick overview and then I'll ask some clarifying questions. Then I can create a new GitHub issue and start working on it.";

interface DashboardParams {
  org: string;
  repo: string;
  developerId: string;
  project: Project;
  sourceMap: string;
  tasks: Task[];
}

const Dashboard: React.FC<DashboardParams> = ({
  org,
  repo,
  developerId,
  project,
  sourceMap,
  tasks: _tasks = [],
}) => {
  const [selectedIcon, setSelectedIcon] = useState<SidebarIcon>(
    SidebarIcon.Plan,
  );
  const [tasks, setTasks] = useState<Task[]>(_tasks ?? []);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(
    tasks?.[0],
  );

  const [selectedTodo, setSelectedTodo] = useState<Todo | undefined>(undefined);

  const chatRef = useRef<ChatComponentHandle>(null);

  //** Data Fetching */
  const selectedDeveloper = DEVELOPERS.find((d) => d.id === developerId);
  const {
    data: todos,
    isLoading: loadingTodos,
    refetch: refetchTodos,
  } = api.todos.getAll.useQuery({
    projectId: project.id,
    developerId,
  });
  useEffect(() => {
    if (todos?.length && todos[0]) {
      onNewTodoSelected(todos[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todos]);

  api.events.onAdd.useSubscription(
    { org, repo },
    {
      onData(event) {
        const { issueId, payload } = event;
        const existingTask = tasks.find((t) => t.issueId === issueId);
        if (payload.type === TaskType.task) {
          if (existingTask) {
            console.log(
              "ignoring task (for now) - because it already exists",
              payload,
            );

            setSelectedTask({
              ...existingTask,
              plan: getPlanForTaskSubType(payload.subType),
              status: TaskStatus.DONE,
              currentPlanStep: (existingTask.plan?.length ?? 1) - 1,
              statusDescription: "Task completed",
            });
            return;
          }
          if (!issueId) {
            console.warn("No issueId found in task event", event);
            return;
          }
          const newTask = {
            ...payload,
            issueId,
            plan: getPlanForTaskSubType(payload.subType),
          };
          setTasks([newTask, ...tasks]);
          setSelectedTask(newTask);
          setSelectedIcon(SidebarIcon.Plan);
        } else {
          // get the task for the data's issueId
          if (!existingTask) {
            console.warn("No existing task found for issueId", {
              event,
              issueId,
            });
            return;
          }
          const newTask = { ...existingTask };
          // update the task with the new payload
          if (payload.type === TaskType.issue) {
            newTask.issue = payload;
          }
          if (payload.type === TaskType.pull_request) {
            newTask.pullRequest = payload;
          }
          if (payload.type === TaskType.code) {
            // Loop throught the code files and update the task with the new code if it exists, add it if it doesn't
            const codeFile = payload;
            const newCodeFiles = [...(newTask.codeFiles ?? [])];
            const index = newCodeFiles.findIndex(
              (c) => c.fileName === codeFile.fileName,
            );
            if (index !== -1) {
              newCodeFiles[index] = codeFile;
            } else {
              newCodeFiles.push(codeFile);
            }
            newTask.codeFiles = newCodeFiles;
          }
          if (payload.type === TaskType.command) {
            // add the command to the task.commands array
            newTask.commands = [...(newTask.commands ?? []), payload];
          }
          if (payload.type === TaskType.prompt) {
            // add the prompt to the task.prompts array
            newTask.prompts = [...(newTask.prompts ?? []), payload];
          }

          // update the task in the tasks array
          setTasks((tasks) =>
            tasks.map((t) => (t.id === existingTask.id ? newTask : t)),
          );
          setSelectedTask(newTask);
          setSelectedIcon(getSidebarIconForType(payload.type));
        }
      },
      onError(err) {
        console.error("Subscription error:", err);
      },
    },
  );

  useEffect(() => {
    if (selectedDeveloper) {
      resetMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeveloper]);

  const onNewTodoSelected = (todo: Todo) => {
    setSelectedTodo(todo);
    resetMessages([
      {
        role: Role.ASSISTANT,
        content: `I'm ready to help with the *${todo.name}* task. Want to start working on this?`,
      },
    ]);
  };

  const updateTodoPositions = async (ids: number[]) => {
    await trpcClient.todos.updatePosition.mutate(ids);
    await refetchTodos();
  };

  const onRemoveTask = (taskId: string) => {
    console.log("Removing task: ", taskId);
    setTasks((tasks) => tasks?.filter((t) => t.id !== taskId));
  };

  const resetMessages = (messages?: Message[] | undefined) => {
    const _messages = messages ?? [
      {
        role: Role.ASSISTANT,
        content: selectedDeveloper?.startingMessage ?? CREATE_ISSUE_PROMPT,
      },
    ];
    chatRef?.current?.resetChat(_messages);
  };

  const handleCreateNewTask = async (messages: Message[]) => {
    try {
      chatRef?.current?.setLoading(true);

      const { title, body } = await trpcClient.github.extractIssue.query({
        messages: messages
          .filter((m) => m.role === Role.ASSISTANT)
          .slice(-3) // Only look at the last 3 messages so we don't accidently grab an issue that was already created
          .map((m) => m.content)
          .join("\n"),
      });
      if (!title || !body) {
        throw new Error("Failed to extract issue title or description");
      }

      const createResponse = await trpcClient.github.createIssue.mutate({
        repo: `${org}/${repo}`,
        title,
        body,
      });
      if (!createResponse?.id) {
        throw new Error("Failed to create issue");
      }
      toast.success("Issue created successfully");
    } catch (error) {
      console.error("Failed to create issue", error);
      toast.error("Failed to create issue");
    } finally {
      chatRef?.current?.setLoading(true);
    }
  };

  const handleUpdateIssue = async (messages: Message[]) => {
    try {
      chatRef?.current?.setLoading(true);
      if (!selectedTodo?.issueId) {
        throw new Error("No issueId to update");
      }
      // get the new issue description from the messages

      const data = await trpcClient.github.extractIssue.query({
        messages: messages
          .filter((m) => m.role === Role.ASSISTANT)
          .slice(-3) // Only look at the last 3 messages so we don't accidently grab an issue that was already created
          .map((m) => m.content)
          .join("\n"),
      });
      if (!data.title || !data.body) {
        throw new Error("Failed to extract issue title or description");
      }
      const { title, body } =
        await trpcClient.github.getIssueTitleAndBody.query({
          repo: `${org}/${repo}`,
          title: data.title,
          body: data.body,
        });
      if (!title || !body) {
        throw new Error("Failed to extract issue from message");
      }
      const { id: updatedIssueId } = await trpcClient.github.updateIssue.mutate(
        {
          repo: `${org}/${repo}`,
          id: selectedTodo.issueId,
          title,
          body,
        },
      );

      if (!updatedIssueId) {
        throw new Error("Failed to update issue");
      }

      // Remove this todo from the list of todos and optimistically update the UI
      const newTodos = todos?.filter((t) => t.id !== selectedTodo.id) ?? [];
      newTodos.length ? onNewTodoSelected(newTodos[0]!) : resetMessages();

      await trpcClient.todos.archive.mutate({
        id: selectedTodo.id,
      });
      await refetchTodos();
      toast.success("Issue updated successfully");
    } catch (error) {
      console.error("Failed to update issue", error);
      toast.error("Failed to update issue");
    } finally {
      chatRef?.current?.setLoading(true);
    }
  };

  //** End Task */

  const tasksInProgressOrDone =
    tasks?.filter(
      (t) =>
        t.status === TaskStatus.IN_PROGRESS || t.status === TaskStatus.DONE,
    ) ?? [];

  return (
    <div className="h-screen w-full bg-gray-800 text-left ">
      <div
        className={`grid h-full w-full bg-gray-900 ${tasksInProgressOrDone.length ? "grid-cols-12" : "mx-auto max-w-7xl grid-cols-6 bg-gray-900"}`}
      >
        <div className="col-span-4 max-w-7xl bg-gray-900">
          <div className="hide-scrollbar flex h-screen w-full flex-col overflow-hidden bg-gray-900/90">
            <ChatHeader
              selectedRepo={`${org}/${repo}`}
              selectedDeveloper={selectedDeveloper}
            />
            <ChatComponent
              ref={chatRef}
              developer={selectedDeveloper}
              todo={selectedTodo}
              sourceMap={sourceMap}
              handleCreateNewTask={handleCreateNewTask}
              handleUpdateIssue={handleUpdateIssue}
            />
          </div>
        </div>
        <div className="col-span-2 h-screen max-w-7xl bg-gray-900/70">
          <Todos
            todos={todos ?? []}
            updateTodoPositions={updateTodoPositions}
            isLoading={loadingTodos}
          />
        </div>

        <div
          className={`col-span-6 bg-gray-900/90 ${tasksInProgressOrDone.length ? "flex" : "hidden"}`}
        >
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
      </div>
    </div>
  );
};

export default Dashboard;
