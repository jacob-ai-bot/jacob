"use client";

import React from "react";
import { Chat } from "./components/Chat";
import { type Project } from "~/server/db/tables/projects.table";
import { type ContextItem } from "~/server/utils/codebaseContext";
import { api } from "~/trpc/react";
import LoadingIndicator from "../components/LoadingIndicator";

interface ChatPageProps {
  org: string;
  repo: string;
}

const ChatPage: React.FC<ChatPageProps> = ({ org, repo }) => {
  const { data: project } = api.events.getProject.useQuery({
    org,
    repo,
  });
  const { data: contextItems } = api.codebaseContext.getAll.useQuery({
    org,
    repo,
  });
  if (!project || !contextItems) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoadingIndicator />
      </div>
    );
  }
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
