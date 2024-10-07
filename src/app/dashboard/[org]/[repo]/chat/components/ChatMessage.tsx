"use client";

import { memo } from "react";
import { type Message } from "ai";
import { motion, AnimatePresence } from "framer-motion";

import { LoadingCard } from "./LoadingCard";
import MarkdownRenderer from "../../components/MarkdownRenderer";

export type ChatMessageProps = {
  message: Message;
  isLast: boolean;
  isCreatingArtifact: boolean;
  showLoadingCard: boolean;
  fileName?: string | null | undefined;
};

function ChatMessage({
  message,
  isLast,
  isCreatingArtifact,
  showLoadingCard,
  fileName,
}: ChatMessageProps) {
  return (
    <div
      key={message.id}
      className={`mb-4 flex ${
        message.role === "user" ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`inline-block max-w-[80%] rounded-lg p-2 ${
          message.role === "user"
            ? "bg-aurora-50 text-dark-blue dark:bg-sky-500/40"
            : "bg-white text-dark-blue dark:bg-slate-700 dark:text-slate-100"
        }`}
      >
        <MarkdownRenderer className={`markdown-chat px-1`}>
          {message.content}
        </MarkdownRenderer>
        {isCreatingArtifact &&
          isLast &&
          (message.role === "assistant" || message.role === "system") && (
            <AnimatePresence>
              {showLoadingCard && (
                <motion.div
                  className="m-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <LoadingCard fileName={fileName} />
                </motion.div>
              )}
            </AnimatePresence>
          )}
      </div>
    </div>
  );
}

export default memo(ChatMessage);
