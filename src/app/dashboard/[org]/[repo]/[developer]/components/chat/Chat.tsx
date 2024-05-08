import { faArrowDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { type FC } from "react";
import { type Message } from "~/types";
import { ChatInput } from "./ChatInput";
import { ChatLoader } from "./ChatLoader";
import { ChatMessage } from "./ChatMessage";

interface Props {
  messages: Message[];
  loading: boolean;
  onSend: (message: Message) => void;
  onReset: () => void;
  onCreateNewTask: () => void;
  onUpdateIssue: () => void;
  isResponding?: boolean;
  shouldHideLogo?: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  sidebarRef: React.RefObject<HTMLDivElement>;
  checkIfAtBottom: () => void;
  scrollToBottom: () => void;
  isAtBottom: boolean;
}

export const Chat: FC<Props> = ({
  messages,
  loading,
  onSend,
  onReset,
  onCreateNewTask,
  onUpdateIssue,
  isResponding = false,
  shouldHideLogo = false,
  messagesEndRef,
  sidebarRef,
  checkIfAtBottom,
  scrollToBottom,
  isAtBottom,
}) => {
  return (
    <div
      className="space-between flex flex-col rounded-lg px-2 pb-8 sm:p-4"
      style={{ height: "calc(100vh - 6rem)" }}
    >
      <div
        className="hide-scrollbar flex flex-1 flex-col overflow-y-auto"
        ref={sidebarRef}
        onScroll={checkIfAtBottom}
      >
        {messages.map((message, index) => (
          <div key={index} className="my-1 sm:my-2">
            <ChatMessage
              message={message}
              isResponding={isResponding}
              onCreateNewTask={onCreateNewTask}
              onUpdateIssue={onUpdateIssue}
            />
          </div>
        ))}

        {loading && (
          <div className="my-1 sm:my-1.5">
            <ChatLoader />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="relative left-0 mt-3 w-full sm:mt-6">
        <ChatInput onSend={onSend} isResponding={isResponding} />
        {!isAtBottom && (
          <div
            className="absolute left-1/2 top-0 -my-12  flex h-10 w-10 -translate-x-1/2 transform cursor-pointer items-center justify-center rounded-full border border-gray-300 bg-white bg-opacity-80  transition duration-300 ease-in-out hover:bg-opacity-100"
            onClick={scrollToBottom}
          >
            <FontAwesomeIcon icon={faArrowDown} size="2x" />
          </div>
        )}
      </div>
    </div>
  );
};
