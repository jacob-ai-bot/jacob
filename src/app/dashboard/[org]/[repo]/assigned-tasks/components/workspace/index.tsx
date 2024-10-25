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

  useEffect(() => {
    if (!selectedTask) return;
    // filter out the commands and prompts that are before the currentEventIndex
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
  };

  return (
    <div className="flex flex-grow flex-row overflow-hidden">
      {/* Main Content Area */}
      <div className="hide-scrollbar relative h-[calc(100vh-116px)] w-full overflow-y-scroll">
        <div ref={topRef} />
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
