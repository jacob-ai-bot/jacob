import React from "react";
import { Chat } from "./Chat";
import { type ContextItem } from "~/server/utils/codebaseContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";

interface ChatModalProps {
  file: ContextItem;
  onClose: () => void;
}

const ChatModal: React.FC<ChatModalProps> = ({ file, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            Chat about {file.file}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>
        <Chat focusedFile={file} />
      </div>
    </div>
  );
};

export default ChatModal;
