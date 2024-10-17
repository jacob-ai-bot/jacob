import { useRef } from "react";
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
import { motion } from "framer-motion";

type WorkspaceProps = {
  tasks: Task[];
  selectedIcon: SidebarIcon;
  selectedTask?: Task;
  setSelectedIcon: (icon: SidebarIcon) => void;
  setSelectedTask: (task: Task | undefined) => void;
  org: string;
  repo: string;
};

const Workspace: React.FC<WorkspaceProps> = ({
  selectedIcon,
  selectedTask,
  setSelectedIcon,
  org,
  repo,
}) => {
  const topRef = useRef<HTMLDivElement>(null);
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
        return (
          <CodeComponent
            codeFiles={selectedTask?.codeFiles}
            org={org}
            repo={repo}
            // todo: add branch
          />
        );
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
    topRef.current?.scrollIntoView({ behavior: "instant" });
  };

  return (
    <div className="flex flex-grow flex-row overflow-hidden">
      {/* Main Content Area */}
      <div className="hide-scrollbar relative h-[calc(100vh-116px)] w-full overflow-y-scroll">
        <div ref={topRef} />
        <div className="sticky top-0 z-50 flex items-center justify-between bg-white/80 p-6 pb-2 backdrop-blur-lg dark:bg-gray-800">
          <div className="flex flex-row items-center space-x-2">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              {selectedTask?.name ?? ""}
            </h2>
            {selectedTask && (
              <div
                className={`inline-flex items-center text-center text-sm font-medium ${
                  selectedTask.status === TaskStatus.DONE
                    ? "bg-aurora-100 text-aurora-800 dark:bg-aurora-800 dark:text-aurora-100"
                    : selectedTask.status === TaskStatus.IN_PROGRESS
                      ? "bg-meadow-100 text-meadow-800 dark:bg-meadow-800 dark:text-meadow-100"
                      : selectedTask.status === TaskStatus.ERROR
                        ? "bg-error-100 text-error-800 dark:bg-error-800 dark:text-error-100"
                        : "bg-sunset-100 text-sunset-800 dark:bg-sunset-800 dark:text-sunset-100"
                } whitespace-nowrap rounded-full px-2 py-1`}
              >
                {getTaskStatusLabel(selectedTask.status)}
              </div>
            )}
          </div>
          {selectedTask?.pullRequest && (
            <motion.a
              href={selectedTask.pullRequest.link}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="ml-2 whitespace-nowrap rounded-full bg-aurora-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-aurora-600 hover:text-aurora-50 dark:bg-sky-600/30 dark:hover:bg-sky-500/30"
            >
              View Pull Request
            </motion.a>
          )}
        </div>
        <div className="p-6 pt-4">{renderComponent(selectedTask)}</div>
      </div>
      {/* Sidebar */}
      <div className="border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <Sidebar selectedIcon={selectedIcon} onIconClick={onIconClick} />
      </div>
    </div>
  );
};

export default Workspace;
