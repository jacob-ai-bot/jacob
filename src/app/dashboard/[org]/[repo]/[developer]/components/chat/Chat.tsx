import { faArrowDown, faUpload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { type FC, useState } from "react";
import { type Message } from "~/types";
import { ChatInput } from "./ChatInput";
import { ChatLoader } from "./ChatLoader";
import { ChatMessage } from "./ChatMessage";
import { toast } from "react-toastify";

interface Props {
  messages: Message[];
  loading: boolean;
  onSend: (message: Message) => void;
  onReset: () => void;
  onCreateNewTask: (messages: Message[]) => void;
  onUpdateIssue: (messages: Message[]) => void;
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
  onCreateNewTask,
  onUpdateIssue,
  isResponding = false,
  messagesEndRef,
  sidebarRef,
  checkIfAtBottom,
  scrollToBottom,
  isAtBottom,
}) => {
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files) return;

    const validFiles = Array.from(files).filter((file) => {
      const isValidType =
        file.type === "image/png" || file.type === "image/jpeg";
      const isValidSize = file.size <= 20 * 1024 * 1024; // 20MB
      if (!isValidType) {
        toast.error("Only PNG and JPEG images are allowed.");
      }
      if (!isValidSize) {
        toast.error("Image must be under 20MB.");
      }
      return isValidType && isValidSize;
    });

    if (validFiles.length === 0) return;

    setUploading(true);

    try {
      const uploadPromises = validFiles.map(async (file) => {
        const formData = new FormData();
        formData.append("image", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to upload image");
        }

        const data = await response.json();
        return data.url;
      });

      const urls = await Promise.all(uploadPromises);
      // Handle the URLs as needed, e.g., send them with a chat message
      console.log("Uploaded URLs:", urls);
    } catch (error) {
      toast.error("Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

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
              messageHistory={messages}
              message={message}
              onCreateNewTask={onCreateNewTask}
              onUpdateIssue={onUpdateIssue}
              loading={loading}
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

      <div className="relative left-0 mt-3 flex w-full items-center sm:mt-6">
        <input
          type="file"
          accept="image/png, image/jpeg"
          multiple
          className="hidden"
          id="image-upload"
          onChange={handleImageUpload}
        />
        <label htmlFor="image-upload" className="cursor-pointer">
          <FontAwesomeIcon icon={faUpload} size="2x" />
        </label>
        <ChatInput
          onSend={onSend}
          isResponding={isResponding}
          loading={loading || uploading}
        />
        {!isAtBottom && (
          <div
            className="absolute left-1/2 top-0 -my-14 flex h-10 w-10 -translate-x-1/2 transform cursor-pointer items-center justify-center rounded-full border border-gray-300 bg-white bg-opacity-80  transition duration-300 ease-in-out hover:bg-opacity-100"
            onClick={scrollToBottom}
          >
            <FontAwesomeIcon icon={faArrowDown} size="2x" />
          </div>
        )}
      </div>
    </div>
  );
};
