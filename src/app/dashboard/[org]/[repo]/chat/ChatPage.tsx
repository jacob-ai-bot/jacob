// components/ChatPage.tsx
"use client";

import React, { useMemo } from "react";
import { Chat } from "./components/Chat";
import { api } from "~/trpc/react";
import LoadingIndicator from "../components/LoadingIndicator";
import { useSearchParams } from "next/navigation";

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

  const searchParams = useSearchParams();
  const filePath = searchParams.get("file_path");
  const selectedFilePath = filePath ? decodeURIComponent(filePath) : undefined;

  const memoizedContextItems = useMemo(
    () => contextItems ?? [],
    [contextItems],
  );

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
        contextItems={memoizedContextItems}
        org={org}
        repo={repo}
        selectedFilePath={selectedFilePath}
      />
    </div>
  );
};

export default ChatPage;
