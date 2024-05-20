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
import {
  getIssueDescriptionFromMessages,
  getSidebarIconForType,
} from "~/app/utils";
import Todos from "./components/todos";
import { toast } from "react-toastify";

const CREATE_ISSUE_PROMPT =
  "Looks like our task queue is empty. What do you need to get done next? Give me a quick overview and then I'll ask some clarifying questions. Then I can create a new GitHub issue and start working on it.";

interface DashboardParams {
  org: string;
  repo: string;
  developer: string;
  tasks: Task[];
}

const Dashboard: React.FC<DashboardParams> = ({
  org,
  repo,
  developer,
  tasks: _tasks = [],
}) => {
  const [selectedIcon, setSelectedIcon] = useState<SidebarIcon>(
    SidebarIcon.Plan,
  );
  const [tasks, setTasks] = useState<Task[]>(_tasks ?? []);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(
    tasks?.[0],
  );
  const [todos, setTodos] = useState<Todo[] | undefined>();

  const [selectedTodo, setSelectedTodo] = useState<Todo | undefined>(undefined);

  const chatRef = useRef(null);

  //** Data Fetching */
  const selectedDeveloper = DEVELOPERS.find((d) => d.id === developer);
  const { data: tempTodos, isLoading: loadingTodos } =
    api.github.getTodos.useQuery({
      repo: `${org}/${repo}`,
    });
  useEffect(() => {
    setTodos(tempTodos);
    if (tempTodos?.length && tempTodos[0]) {
      onNewTodoSelected(tempTodos[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tempTodos]);

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
            return;
          }
          if (!issueId) {
            console.warn("No issueId found in task event", event);
            return;
          }
          console.log("adding new task", payload);
          const newTask = { ...payload, issueId };
          setTasks([...tasks, newTask]);
          setSelectedTask(newTask);
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

  //** Task */
  const onStartTask = (taskId: string) => {
    console.log("Starting task: ", taskId);
    // set the task status to in progress
    setTasks((tasks) =>
      tasks?.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            status: TaskStatus.IN_PROGRESS,
          };
        }
        return t;
      }),
    );
  };

  const onNewTodoSelected = (todo: Todo) => {
    setSelectedTodo(todo);
    resetMessages([
      {
        role: Role.ASSISTANT,
        content: `I'm ready to help with the *${todo.name}* task. Want to start working on this?`,
      },
    ]);
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
    if (chatRef?.current) {
      const { resetChat }: ChatComponentHandle = chatRef.current;
      resetChat(_messages);
    }
  };

  // TODO: refactor this
  const handleCreateNewTask = async (messages: Message[]) => {
    console.log("TODO: Create new task with messages", messages);
    // // first, get all the messages that are from the assistant and try to find the most recent the gitub issue mentioned by the assistant (note that the messages will need to be read one by one from last to first in the messages array)
    // // The issue will be surrounded by code blocks with triple backticks and the word github on the first line
    // // i.e. ```github <here is the issue to extract>```
    // const issueText = getIssueDescriptionFromMessages(messages);
    // if (!issueText) {
    //   console.error("No issue found in messages");
    //   console.log("messages", messages);
    //   return;
    // }
    // // call an llm to extract the issue title and description from the issueText
    // const issueResponse = await fetch("/api/dashboard/github-issue", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({ issueText }),
    // });
    // if (!issueResponse.ok) {
    //   console.error("Failed to extract issue:", issueResponse.statusText);
    //   return;
    // }
    // const data = await issueResponse.json();
    // const { title, description } = data;
    // if (!title || !description) {
    //   console.error("Failed to extract issue title or description");
    //   return;
    // }
    // const newIssue: NewIssue = {
    //   title,
    //   description,
    //   repo: selectedRepo,
    // };
    // // send the new issue to the /api/jacob/create-issue endpoint
    // const response = await fetch("/api/jacob/create-issue", {
    //   method: "PUT",
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({ issue: newIssue }),
    // });
    // if (!response.ok) {
    //   console.error("Failed to create issue:", response.statusText);
    //   return;
    // }
  };

  // TODO: refactor this
  const handleUpdateIssue = async (messages: Message[]) => {
    try {
      if (chatRef?.current) {
        const { setLoading }: ChatComponentHandle = chatRef.current;
        setLoading(true);
      }
      if (!selectedTodo?.issueId) {
        throw new Error("No issueId to update");
      }
      // get the new issue description from the messages
      let description = getIssueDescriptionFromMessages(messages) ?? "";
      const extractedIssue = await trpcClient.github.getExtractedIssue.query({
        repo: `${org}/${repo}`,
        issueText: `${selectedTodo.commitTitle} ${description}`,
      });
      if (!extractedIssue) {
        throw new Error("Failed to extract issue from message");
      }

      if (extractedIssue.stepsToAddressIssue) {
        description += `\n\nSteps to Address Issue: ${extractedIssue.stepsToAddressIssue}`;
      }
      if (extractedIssue.filesToCreate?.length) {
        description += `\n\nFiles to Create: ${extractedIssue.filesToCreate.join(
          ", ",
        )}`;
      }
      if (extractedIssue.filesToUpdate?.length) {
        description += `\n\nFiles to Update: ${extractedIssue.filesToUpdate.join(
          ", ",
        )}`;
      }
      description += `\n\ntask assigned to: @jacob-ai-bot`;

      // if we're creating a new file, the task title must have an arrow (=>) followed by the name of the new file to create
      // i.e. "Create a new file => new-file-name.js"
      let title =
        extractedIssue.commitTitle ?? selectedTodo.name ?? "New Issue";
      if (extractedIssue.filesToCreate?.length) {
        title += ` => ${extractedIssue.filesToCreate[0]}`;
      }
      const { id: updatedIssueId } = await trpcClient.github.updateIssue.mutate(
        {
          repo: `${org}/${repo}`,
          id: selectedTodo.issueId,
          title,
          body: description,
        },
      );

      if (!updatedIssueId) {
        throw new Error("Failed to update issue");
      }

      // Remove this todo from the list of todos and
      // A new one will be added when the issue is updated
      const newTodos = todos?.filter((t) => t.id !== selectedTodo.id) ?? [];
      setTodos(newTodos);
      // reset the messages (send in the first task)
      newTodos.length ? onNewTodoSelected(newTodos[0]!) : resetMessages();
      toast.success("Issue updated successfully");
    } catch (error) {
      console.error("Failed to update issue", error);
      toast.error("Failed to update issue");
    } finally {
      if (chatRef?.current) {
        const { setLoading }: ChatComponentHandle = chatRef.current;
        setLoading(false);
      }
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
              handleCreateNewTask={handleCreateNewTask}
              handleUpdateIssue={handleUpdateIssue}
            />
          </div>
        </div>
        <div className="col-span-2 h-screen max-w-7xl bg-gray-900/70">
          <Todos
            todos={todos ?? []}
            onStart={onStartTask}
            setTodos={setTodos}
            onNewTodoSelected={onNewTodoSelected}
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
            onRemoveTask={onRemoveTask}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
