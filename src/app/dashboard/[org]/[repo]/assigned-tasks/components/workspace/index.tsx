import { useEffect, useRef, useState } from "react";
import {
  type Task,
  type Event,
  type Command,
  type Prompt,
} from "~/server/api/routers/events";
import { SidebarIcon } from "~/types";
import { CodeComponent } from "./Code";
import { DesignComponent } from "./Design";
import { IssueComponent } from "./Issue";
import { PromptsComponent } from "./Prompts";
import { PullRequestComponent } from "./PullRequest";
import { TerminalComponent } from "./Terminal";
import Sidebar from "../Sidebar";
import { TaskType } from "~/server/db/enums";
import TaskDetailsPlaceholder from "~/app/_components/DetailsPlaceholder";
type WorkspaceProps = {
  selectedIcon: SidebarIcon;
  selectedTask?: Task;
  setSelectedIcon: (icon: SidebarIcon) => void;
  setSelectedTask: (task: Task | undefined) => void;
  org: string;
  repo: string;
  events: Event[];
  currentEventIndex: number;
};

const Workspace: React.FC<WorkspaceProps> = ({
  selectedIcon,
  selectedTask,
  setSelectedIcon,
  org,
  repo,
  events,
  currentEventIndex,
}) => {
  const topRef = useRef<HTMLDivElement>(null);
  const [commands, setCommands] = useState<Command[]>(
    selectedTask?.commands ?? [],
  );
  const [prompts, setPrompts] = useState<Prompt[]>(selectedTask?.prompts ?? []);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  useEffect(() => {
    if (!selectedTask) return;
    setCommands(
      selectedTask?.commands?.filter(
        (c) => c.eventIndex <= currentEventIndex + 1,
      ) ?? [],
    );
    setPrompts(
      selectedTask?.prompts?.filter(
        (p) => p.eventIndex <= currentEventIndex + 1,
      ) ?? [],
    );
  }, [selectedTask, currentEventIndex]);

  useEffect(() => {
    if (events.length > 0) {
      const latestEvent = events[events.length - 1];
      if (!latestEvent) return;
      switch (latestEvent.type) {
        case TaskType.code:
          setSelectedIcon(SidebarIcon.Code);
          break;
        case TaskType.terminal:
        case TaskType.command:
          setSelectedIcon(SidebarIcon.Terminal);
          break;
        case TaskType.issue:
          setSelectedIcon(SidebarIcon.Issues);
          break;
        case TaskType.design:
          setSelectedIcon(SidebarIcon.Design);
          break;
        case TaskType.prompt:
          setSelectedIcon(SidebarIcon.Prompts);
          break;
        case TaskType.pull_request:
          setSelectedIcon(SidebarIcon.PullRequests);
          break;
        default:
          setSelectedIcon(SidebarIcon.Code);
      }
    }
  }, [events, setSelectedIcon]);

  const renderComponent = (selectedTask: Task | undefined) => {
    if (!selectedTask) {
      return <TaskDetailsPlaceholder />;
    }
    switch (selectedIcon) {
      case SidebarIcon.Code:
        return (
          <CodeComponent
            codeFiles={selectedTask?.codeFiles}
            org={org}
            repo={repo}
          />
        );
      case SidebarIcon.Terminal:
        return <TerminalComponent commands={commands} />;
      case SidebarIcon.Issues:
        return <IssueComponent issue={selectedTask?.issue} />;
      case SidebarIcon.Design:
        return <DesignComponent imageUrl={selectedTask?.imageUrl} />;
      case SidebarIcon.Prompts:
        return <PromptsComponent promptDetailsArray={prompts} />;
      case SidebarIcon.PullRequests:
        return <PullRequestComponent pullRequest={selectedTask?.pullRequest} />;
      default:
        return (
          <CodeComponent
            codeFiles={selectedTask?.codeFiles}
            org={org}
            repo={repo}
          />
        );
    }
  };

  const onIconClick = (icon: SidebarIcon) => {
    setSelectedIcon(icon);
    topRef.current?.scrollIntoView({ behavior: "instant" });
    setIsSidebarVisible(false);
  };

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  return (
    <div className="flex flex-grow flex-row overflow-hidden">
      <div className="hide-scrollbar relative h-[calc(100vh-116px)] w-full overflow-y-scroll">
        <div ref={topRef} />
        <div className="p-4 pt-4 sm:p-6">{renderComponent(selectedTask)}</div>
      </div>
      <div className="hidden border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 sm:block">
        <Sidebar selectedIcon={selectedIcon} onIconClick={onIconClick} />
      </div>
      <button
        onClick={toggleSidebar}
        className="fixed bottom-3 right-4 z-50 rounded-full bg-aurora-600 px-3 py-1 text-white shadow-lg sm:hidden"
      >
        Menu
      </button>
      {isSidebarVisible && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-50 sm:hidden"
          onClick={toggleSidebar}
        >
          <div
            className="absolute bottom-0 right-0 h-screen w-16 bg-white dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar selectedIcon={selectedIcon} onIconClick={onIconClick} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Workspace;
