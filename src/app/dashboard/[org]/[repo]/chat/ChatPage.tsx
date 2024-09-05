"use client";

import React from "react";
import { Chat } from "./components/Chat";

interface ChatPageProps {
  org: string;
  repo: string;
  developerId: string;
  sourceMap: string;
}

const ChatPage: React.FC<ChatPageProps> = ({
  org,
  repo,
  developerId,
  sourceMap,
}) => {
  return (
    <div className="h-full w-full text-left">
      <Chat />
    </div>
  );
};

export default ChatPage;
