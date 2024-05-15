"use client";

import React, { useEffect, useRef, useState } from "react";
import ChatComponent, { type ChatComponentHandle } from "./components/chat";
import ChatHeader from "./components/chat/ChatHeader";
import Tasks from "./components/tasks";
import Workspace from "./components/workspace";
import { type Message, Role, SidebarIcon } from "~/types";
import { TaskStatus } from "~/server/db/enums";

import { type Task } from "~/server/api/routers/events";
import { api } from "~/trpc/react";
import { DEVELOPERS } from "~/data/developers";
import { TaskType } from "~/server/db/enums";
import { getSidebarIconForType } from "~/app/utils";

// const CREATE_ISSUE_PROMPT =
//   "Looks like our task queue is empty. What do you need to get done next? Give me a quick overview and then I'll ask some clarifying questions. Then I can create a new GitHub issue and start working on it.";

const DEMO_PROMPT =
  "Hallo! I'm ready to help you with your tasks. It looks like you currently have one GitHub task assigned to you. The task is to create a new Checkout form. Here is a link to the Figma design: [Checkout form](https://www.figma.com/file/L1QVjEXUIniizBjw0dRnBw/JACoB-Home-Page?type=design&node-id=73-81&mode=design&t=vTxaMbZbl5n0G1Xx-4). Click that link to open the JACoB Figma plugin and jump back here when you're finished. If you have any questions, feel free to ask!";

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
  const [loadingTasks /* , setLoadingTasks */] = useState<boolean>(false);
  const [selectedIcon, setSelectedIcon] = useState<SidebarIcon>(
    SidebarIcon.Plan,
  );
  const [tasks, setTasks] = useState<Task[]>(_tasks ?? []);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(
    tasks?.[0],
  );

  const chatRef = useRef(null);

  useEffect(() => {
    resetMessages();
  }, []);

  //** Data Fetching */
  // trpc.post.onAdd.useSubscription(undefined, {
  //   onData(post) {
  //     addMessages([post]);
  //   },
  //   onError(err) {
  //     console.error('Subscription error:', err);
  //     // we might have missed a message - invalidate cache
  //     utils.post.infinite.invalidate();
  //   },
  // });
  api.events.onAdd.useSubscription(undefined, {
    onData(data) {
      console.log("Event data: ", data);
      debugger;
      if (!data?.payload) {
        console.error("No payload found in event data");
        return;
      }
      const issueId = data.issueId;
      const payload = data.payload;
      if (payload.type === TaskType.task) {
        setTasks([...tasks, payload]);
        setSelectedTask(payload);
      } else {
        // get the task for the data's issueId
        const task = tasks.find((t) => t.issue?.issueId === issueId);
        if (!task) {
          const newTask = data.task;
          if (!newTask) {
            console.error("No task found for issueId");
            return;
          }
          if (newTask.name === "New Task") {
            setSelectedIcon(getSidebarIconForType(payload.type));
            return;
          }
          setTasks([...tasks, newTask]);
          // Note that by calling the server to get the updated tasks,
          // we will also get the new data that was just added
          setSelectedTask(newTask);
          setSelectedIcon(getSidebarIconForType(payload.type));
          return;
        }
        // update the task with the new payload
        if (payload.type === TaskType.issue) {
          task.issue = payload;
        }
        if (payload.type === TaskType.pull_request) {
          task.pullRequest = payload;
        }
        if (payload.type === TaskType.code) {
          // Loop throught the code files and update the task with the new code if it exists, add it if it doesn't
          const codeFile = payload;
          const codeFiles = task.codeFiles ?? [];
          const index = codeFiles.findIndex(
            (c) => c.fileName === codeFile.fileName,
          );
          if (index !== -1) {
            codeFiles[index] = codeFile;
          } else {
            codeFiles.push(codeFile);
          }
          task.codeFiles = codeFiles;
        }
        if (payload.type === TaskType.command) {
          // add the command to the task.commands array
          // if the task.commands array doesn't exist, create it
          task.commands = task.commands ?? [];
          task.commands.push(payload);
        }
        if (payload.type === TaskType.prompt) {
          // add the prompt to the task.prompts array
          // if the task.prompts array doesn't exist, create it
          task.prompts = task.prompts ?? [];
          task.prompts.push(payload);
        }

        // update the task in the tasks array
        setTasks((tasks) => tasks.map((t) => (t.id === task.id ? task : t)));

        setSelectedIcon(getSidebarIconForType(payload.type));
      }
    },
    onError(err) {
      console.error("Subscription error:", err);
    },
  });

  const selectedDeveloper = DEVELOPERS.find((d) => d.id === developer);

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

  const onNewTaskSelected = (task: Task) => {
    setSelectedTask(task);
    resetMessages(task);
  };

  const onRemoveTask = (taskId: string) => {
    console.log("Removing task: ", taskId);
    setTasks((tasks) => tasks?.filter((t) => t.id !== taskId));
  };

  const resetMessages = (task?: Task) => {
    let messages: Message[] | undefined;
    if (task) {
      messages = [
        {
          role: Role.ASSISTANT,
          content: `I'm ready to help with the *${task.name}* task. Want to start working on this?`,
        },
      ];
    } else {
      messages = [
        {
          role: Role.ASSISTANT,
          content: DEMO_PROMPT, //selectedDeveloper?.startingMessage ?? CREATE_ISSUE_PROMPT,
        },
      ];
    }
    if (chatRef?.current) {
      const { resetChat }: ChatComponentHandle = chatRef.current;
      resetChat(messages);
    }
  };

  // TODO: refactor this
  const handleCreateNewTask = async () => {
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
  const handleUpdateIssue = async () => {
    // // get the first task from the tasks array that has a status of TaskStatus.TODO
    // const task = tasks.find((t) => t.status === TaskStatus.TODO);
    // // send the task to the /api/jacob/update-issue endpoint
    // if (!task?.issue) {
    //   console.error("No task or issue found to update issue");
    //   return;
    // }
    // const updatedIssue = task.issue;
    // // get the new issue description from the messages
    // const newIssueDescription = getIssueDescriptionFromMessages(messages) ?? "";
    // // To kick off the JACoB process, add the text @jacob-ai-bot to the body of the issue
    // updatedIssue.description = `${newIssueDescription}\n\ntask assigned to: @jacob-ai-bot`;
    // // if the updatedIssue type is CREATE_NEW_FILE, the task title must have an arrow (=>) followed by the name of the new file to create
    // // i.e. "Create a new file => new-file-name.js"
    // if (task.type === TaskType.CREATE_NEW_FILE) {
    //   const newFileName = extractFilePathWithArrow(updatedIssue.title);
    //   if (!newFileName && updatedIssue.filesToCreate?.length) {
    //     updatedIssue.title += ` => ${updatedIssue.filesToCreate[0]}`;
    //   }
    // }
    // const response = await fetch("/api/jacob/update-issue", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({ issue: updatedIssue }),
    // });
    // // the response should have the updated issue object. Add it to the task and update the task in the tasks array
    // const data = (await response.json()) as {
    //   message: Text;
    // };
    // if (!response.ok) {
    //   console.error("Failed to update issue:", data.message);
    //   return;
    // }
    // // Remove this task from the list of tasks
    // // A new one will be added when the issue is updated
    // const newTasks = tasks.filter((t) => t.id !== task.id);
    // setTasks(newTasks);
    // // reset the messages (send in the first task)
    // newTasks.length ? onNewTaskSelected(newTasks[0]!) : handleReset();
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
              task={selectedTask}
              handleCreateNewTask={handleCreateNewTask}
              handleUpdateIssue={handleUpdateIssue}
            />
          </div>
        </div>
        <div className="col-span-2 h-screen max-w-7xl bg-gray-900/70">
          <Tasks
            tasks={tasks ?? []}
            onStart={onStartTask}
            setTasks={setTasks}
            onNewTaskSelected={onNewTaskSelected}
            isLoading={loadingTasks}
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
