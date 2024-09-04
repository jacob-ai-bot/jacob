"use client";

import React, { useRef } from "react";
import ChatComponent, {
  type ChatComponentHandle,
} from "../otto/components/chat";
import ChatHeader from "../otto/components/chat/ChatHeader";
import { DEVELOPERS } from "~/data/developers";
import { type Message, Role } from "~/types";
import { api } from "~/trpc/react";
import { trpcClient } from "~/trpc/client";
import { toast } from "react-toastify";
import { TodoStatus } from "~/server/db/enums";

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
  const chatRef = useRef<ChatComponentHandle>(null);
  const selectedDeveloper = DEVELOPERS.find((d) => d.id === developerId);

  const handleCreateNewTask = async (messages: Message[]) => {
    try {
      chatRef?.current?.setLoading(true);

      const { title, body } = await trpcClient.github.extractIssue.query({
        messages: messages
          .filter((m) => m.role === Role.ASSISTANT)
          .slice(-3)
          .map((m) => m.content)
          .join("\n"),
      });

      if (!title || !body) {
        throw new Error("Failed to extract issue title or description");
      }

      const createResponse = await trpcClient.github.createIssue.mutate({
        repo: `${org}/${repo}`,
        title,
        body,
      });

      if (!createResponse?.id) {
        throw new Error("Failed to create issue");
      }

      toast.success("Issue created successfully");
    } catch (error) {
      console.error("Failed to create issue", error);
      toast.error("Failed to create issue");
    } finally {
      chatRef?.current?.setLoading(false);
    }
  };
  const handleUpdateIssue = (messages: Message[]) => {
    try {
      chatRef?.current?.setLoading(true);
    } catch (error) {
      console.error("Failed to update issue", error);
      toast.error("Failed to update issue");
    } finally {
      chatRef?.current?.setLoading(false);
    }
  };
  const todo = {
    id: 1,
    title: "Todo",
    description: "Todo",
    projectId: 1,
    name: "Todo",
    status: TodoStatus.TODO,
    position: 1,
    isArchived: false,
  };

  return (
    <div className="h-screen w-full bg-gray-800 text-left">
      <div className="mx-auto max-w-7xl grid-cols-6 bg-gray-900">
        <div className="col-span-6 max-w-7xl bg-gray-900">
          <div className="hide-scrollbar flex h-screen w-full flex-col overflow-hidden bg-gray-900/90">
            <ChatComponent
              ref={chatRef}
              developer={selectedDeveloper}
              sourceMap={sourceMap}
              handleCreateNewTask={handleCreateNewTask}
              handleUpdateIssue={handleUpdateIssue}
              todo={todo}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
