import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faClock,
  faCheckCircle,
  faTimesCircle,
} from "@fortawesome/free-solid-svg-icons";
import { TaskStatus, type Task } from "~/types";
import { SidebarIcon } from "~/types";
import { CodeComponent } from "./Code";
import { DesignComponent } from "./Design";
import { IssueComponent } from "./Issue";
import { PlanComponent } from "./Plan";
import { PromptsComponent } from "./Prompts";
import { PullRequestComponent } from "./PullRequest";
import { TerminalComponent } from "./Terminal";
import Sidebar from "../Sidebar";

type WorkspaceProps = {
  tasks: Task[];
  selectedIcon: SidebarIcon;
  selectedTask?: Task;
  onRemoveTask: (taskId: string) => void;
};

const Workspace: React.FC<WorkspaceProps> = ({
  tasks,
  selectedIcon: _selectedIcon,
  selectedTask: _selectedTask,
  onRemoveTask,
}) => {
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(
    _selectedTask,
  );
  const [selectedIcon, setSelectedIcon] = useState<SidebarIcon>(_selectedIcon);

  // if new tasks are added, update selectedTask to the first task
  useEffect(() => {
    if (tasks && tasks.length > 0 && !selectedTask) {
      setSelectedTask(tasks[0]);
    }
  }, [tasks, selectedTask]);

  // if the selected icon changes, update the selected icon
  useEffect(() => {
    setSelectedIcon(_selectedIcon);
  }, [_selectedIcon]);

  const renderComponent = () => {
    if (!selectedTask) {
      return null;
    } else {
      console.log("Selected task: ", selectedTask);
    }
    switch (selectedIcon) {
      case SidebarIcon.Plan: {
        const planSteps = selectedTask.plan ?? [];
        const currentPlanStep = selectedTask.currentPlanStep ?? 0; // TODO: Implement logic to determine current plan step
        return (
          <PlanComponent
            planSteps={planSteps}
            currentPlanStep={currentPlanStep}
          />
        );
      }

      case SidebarIcon.Code:
        return <CodeComponent codeFiles={selectedTask?.codeFiles} />;
      case SidebarIcon.Terminal:
        return <TerminalComponent commands={selectedTask?.commands} />;
      case SidebarIcon.Issues:
        return <IssueComponent issue={selectedTask?.issue} />;
      case SidebarIcon.Design:
        return <DesignComponent imageUrl={selectedTask?.imageUrl} />;
      case SidebarIcon.Prompts:
        return <PromptsComponent promptDetailsArray={selectedTask.prompts} />;
      case SidebarIcon.PullRequests:
        return <PullRequestComponent pullRequest={selectedTask?.pullRequest} />;
      default:
        return null;
    }
  };
  const handleRemoveTask = (task: Task) => {
    // if the task being removed is the selected task, set selected task to undefined
    if (selectedTask?.id === task.id) {
      setSelectedTask(undefined);
    }
    onRemoveTask(task?.id);
  };

  const handleSelectTask = (task: Task) => {
    setSelectedTask(task);
  };

  const onIconClick = (icon: SidebarIcon) => {
    setSelectedIcon(icon);
  };

  return (
    <>
      <div className="flex h-screen w-full flex-grow flex-col overflow-hidden">
        <div className="mt-3 flex w-full overflow-x-auto border-b border-blueGray-600 px-2">
          {tasks?.map((task) => (
            <div
              key={task.id}
              className={`mr-2 flex flex-shrink-0 items-center rounded-t-md px-2 py-2 ${selectedTask?.id === task.id ? "bg-slate-700 text-orange" : "bg-blueGray-800 text-blueGray-500"} transition duration-300 ease-in-out hover:bg-slate-700 hover:text-orange`}
            >
              <button
                className=" max-w-[30rem] truncate text-sm"
                onClick={() => handleSelectTask(task)}
              >
                {task.name}
              </button>
              <button
                className="ml-2 h-6 w-6 text-gray-300  hover:rounded-full hover:bg-gray-500"
                onClick={() => handleRemoveTask(task)}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          ))}
        </div>
        <>
          <div className="flex" style={{ height: "calc(100vh - 9rem)" }}>
            <div className="hide-scrollbar h-full w-full overflow-y-auto">
              <div className="flex h-full w-full flex-grow p-4">
                {renderComponent()}
              </div>
            </div>
          </div>
          <div className="flex h-24  border-t-2 border-blueGray-600/50 bg-black p-2 text-sm text-blueGray-400">
            {selectedTask && (
              <>
                <div className="mr-4">
                  {selectedTask.status === TaskStatus.IN_PROGRESS && (
                    <FontAwesomeIcon
                      icon={faClock}
                      className="text-yellow-500/50"
                    />
                  )}
                  {selectedTask.status === TaskStatus.DONE && (
                    <FontAwesomeIcon
                      icon={faCheckCircle}
                      className="text-green-700"
                    />
                  )}
                  {selectedTask.status === TaskStatus.ERROR && (
                    <FontAwesomeIcon
                      icon={faTimesCircle}
                      className="text-red-700"
                    />
                  )}
                </div>
                <div>
                  <div className="text-blueGray-300">
                    <span className="font-semibold">
                      Step {(selectedTask.currentPlanStep ?? 0) + 1} of{" "}
                      {selectedTask.plan?.length ?? 1}:{" "}
                    </span>
                    {selectedTask.plan
                      ? selectedTask.plan[selectedTask.currentPlanStep ?? 0]
                          ?.title ?? ""
                      : ""}
                  </div>
                  <p className="text-blueGray-400">
                    {selectedTask.statusDescription}{" "}
                    {selectedTask.pullRequest && (
                      <a
                        href={selectedTask.pullRequest.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 underline"
                      >
                        Click Here to Review Pull Request
                      </a>
                    )}
                  </p>
                </div>
              </>
            )}
          </div>
        </>
      </div>
      <div className="h-screen border-l border-blueGray-700 ">
        <Sidebar selectedIcon={selectedIcon} onIconClick={onIconClick} />
      </div>
    </>
  );
};

export default Workspace;
