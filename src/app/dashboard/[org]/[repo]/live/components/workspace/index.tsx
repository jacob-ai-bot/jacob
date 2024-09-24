import React from "react";
import { type Task } from "~/server/api/routers/events";
import { SidebarIcon } from "~/types";
import { CodeComponent } from "./Code";
import { DesignComponent } from "./Design";
import { IssueComponent } from "./Issue";
import { PromptsComponent } from "./Prompts";
import { PullRequestComponent } from "./PullRequest";
import { TerminalComponent } from "./Terminal";
import Sidebar from "../Sidebar";
import { getTaskStatusLabel } from "~/app/utils";
import { TaskStatus } from "~/server/db/enums";

type WorkspaceProps = {
  tasks: Task[];
  selectedIcon: SidebarIcon;
  selectedTask?: Task;
  setSelectedIcon: (icon: SidebarIcon) => void;
  setSelectedTask: (task: Task | undefined) => void;
};

const Workspace: React.FC<WorkspaceProps> = ({
  selectedIcon,
  selectedTask,
  setSelectedIcon,
}) => {
  const renderComponent = (selectedTask: Task | undefined) => {
    if (!selectedTask) {
      return (
        <p className="text-center text-gray-500 dark:text-gray-400">
          Select a task to view details
        </p>
      );
    }
    switch (selectedIcon) {
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

  const onIconClick = (icon: SidebarIcon) => {
    setSelectedIcon(icon);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white dark:bg-gray-800">
      <div className="flex flex-grow flex-row overflow-hidden">
        {/* Main Content Area */}
        <div className="hide-scrollbar h-[calc(100vh-116px)] w-full overflow-y-auto">
          <div className="p-6">
            <div className="mb-6 flex items-center justify-between overflow-clip">
              <div className="flex flex-row space-x-2">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                  {selectedTask?.name ?? "Task Details"}
                </h2>
                {selectedTask && (
                  <div
                    className={`text-center text-sm font-medium ${
                      selectedTask.status === TaskStatus.DONE
                        ? "bg-aurora-100 text-aurora-800 dark:bg-aurora-800 dark:text-aurora-100"
                        : selectedTask.status === TaskStatus.IN_PROGRESS
                          ? "bg-meadow-100 text-meadow-800 dark:bg-meadow-800 dark:text-meadow-100"
                          : selectedTask.status === TaskStatus.ERROR
                            ? "bg-error-100 text-error-800 dark:bg-error-800 dark:text-error-100"
                            : "bg-sunset-100 text-sunset-800 dark:bg-sunset-800 dark:text-sunset-100"
                    } rounded-full px-2 py-1`}
                  >
                    {getTaskStatusLabel(selectedTask.status)}
                  </div>
                )}
              </div>
              {selectedTask?.pullRequest && (
                <a
                  href={selectedTask.pullRequest.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-aurora-500 px-4 py-2 text-white transition-colors hover:bg-aurora-600 dark:bg-aurora-800/80 dark:hover:bg-aurora-700/80"
                >
                  View Pull Request
                </a>
              )}
            </div>
            {renderComponent(selectedTask)}
          </div>
        </div>
        {/* Sidebar */}
        <div className="border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <Sidebar selectedIcon={selectedIcon} onIconClick={onIconClick} />
        </div>
      </div>
    </div>
  );
};

export default Workspace;
