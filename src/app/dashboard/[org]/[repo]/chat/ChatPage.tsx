"use client";

import React from "react";
import { Chat } from "./components/Chat";
import { type Project } from "~/server/db/tables/projects.table";
import { type ContextItem } from "~/server/utils/codebaseContext";

interface ChatPageProps {
  project: Project;
  contextItems: ContextItem[];
  org: string;
  repo: string;
}

const ChatPage: React.FC<ChatPageProps> = ({
  project,
  contextItems,
  org,
  repo,
}) => {
  return (
    <div className="h-full w-full text-left">
      <Chat
        project={project}
        contextItems={contextItems}
        org={org}
        repo={repo}
      />
    </div>
  );
};

export default ChatPage;
