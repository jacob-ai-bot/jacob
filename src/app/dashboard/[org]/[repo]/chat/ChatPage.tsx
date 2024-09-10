"use client";

import React from "react";
import { Chat } from "./components/Chat";
import { type Project } from "~/server/db/tables/projects.table";

interface ChatPageProps {
  org: string;
  repo: string;
  project: Project;
}

const ChatPage: React.FC<ChatPageProps> = ({ org, repo, project }) => {
  return (
    <div className="h-full w-full text-left">
      <Chat project={project} />
    </div>
  );
};

export default ChatPage;
