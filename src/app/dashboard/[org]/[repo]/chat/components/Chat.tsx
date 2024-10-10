import { useState, useEffect, useRef } from "react";
import { type Message, useChat } from "ai/react";
import { type Project } from "~/server/db/tables/projects.table";
import { toast } from "react-toastify";
import Artifact from "./Artifact";
import { type ContextItem } from "~/server/utils/codebaseContext";
import LoadingIndicator from "../../components/LoadingIndicator";

import {
  SpeechToTextArea,
  type SpeechToTextAreaRef,
} from "../../components/SpeechToTextArea";
import { type ChatModel, ChatModels, ModelSelector } from "./ModelSelector";
import SearchBar from "../../components/SearchBar";
import { api } from "~/trpc/react";
import { getLanguageFromFile } from "~/app/utils";
import ChatMessage from "./ChatMessage";
import { useRouter } from "next/router";

interface ChatProps {
  project: Project;
  contextItems: ContextItem[];
  org: string;
  repo: string;
  focusedFile?: ContextItem;
}

export interface CodeFile {
  path: string;
  content?: string;
}

type MessageRole =
  | "system"
  | "user"
  | "assistant"
  | "function"
  | "data"
  | "tool";

const STARTING_MESSAGE = {
  id: "1",
  role: "system" as MessageRole,
  content:
    "Hi, I'm JACoB. I can answer questions about your codebase. Ask me anything!",
};

export function Chat({ contextItems, org, repo, focusedFile }: ChatProps) {
  const [artifactContent, setArtifactContent] = useState<string | null>(null);
  const [artifactFileName, setArtifactFileName] = useState<string>("");
  const [artifactLanguage, setArtifactLanguage] = useState<string>("");
  const [hasStartedStreaming, setHasStartedStreaming] = useState(false);
  const [artifactFilePath, setArtifactFilePath] = useState<string>("");
  const [isCreatingArtifact, setIsCreatingArtifact] = useState(false);
  const [showLoadingCard, setShowLoadingCard] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [model, setModel] = useState<ChatModel>(ChatModels[0]!);
  const [savedMessages, setSavedMessages] = useState<Message[]>([
    STARTING_MESSAGE,
  ]);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<SpeechToTextAreaRef>(null);
  const router = useRouter();

  const { data: codeContent, refetch: refetchCodeContent } =
    api.github.fetchFileContents.useQuery({
      org,
      repo,
      filePaths: selectedFiles,
    });

  const { messages, input, handleInputChange, append, isLoading } = useChat({
    streamProtocol: model.modelName.startsWith("o1") ? "text" : "data",
    api: `/api/chat/${model.provider}`,
    body: {
      model,
      contextItems,
      org,
      repo,
      codeContent,
      focusedFile,
    },
    initialMessages: savedMessages,
    onResponse: async (response) => {
      console.log("onResponse", response);
      setHasStartedStreaming(true);
    },
    onError: (error) => {
      console.error("Error in chat", error);
      toast.error(`Error in chat: ${error.message}`);
    },
    onToolCall: async ({ toolCall }) => {
      const toolCallArgs = toolCall.args as {
        fileName: string;
        content: string;
        language: string;
        filePath: string;
      };
      const { content } = toolCallArgs;
      const filePath = toolCallArgs.filePath ?? codeContent?.[0]?.path ?? "";
      const fileName = toolCallArgs.fileName ?? filePath.split("/").pop();
      const language = toolCallArgs.language ?? getLanguageFromFile(fileName);
      setArtifactContent(content);
      setArtifactFileName(fileName);
      setArtifactLanguage(language);
      setArtifactFilePath(filePath);
    },
    onFinish: () => {
      setHasStartedStreaming(false);
      setIsCreatingArtifact(false);
    },
  });

  useEffect(() => {
    if (messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;
    if (lastMessage.role === "assistant" && lastMessage.content.length > 0) {
      setIsCreatingArtifact(true);
    }
  }, [messages]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (model) {
      setSavedMessages(messages);
    }
  }, [model, messages]);

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.focus();
    }
  }, [model]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isCreatingArtifact) {
      const timer = setTimeout(() => {
        setShowLoadingCard(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setShowLoadingCard(false);
    }
  }, [isCreatingArtifact]);

  useEffect(() => {
    if (codeContent) {
      setArtifactFilePath(codeContent[0]?.path ?? "");
      setArtifactContent(codeContent[0]?.content ?? "");
      const fileName = codeContent[0]?.path?.split("/").pop() ?? "";
      const language = getLanguageFromFile(fileName);
      setArtifactFileName(fileName);
      setArtifactLanguage(language);
    }
  }, [codeContent]);

  const handleSearchResultSelect = (filePath: string) => {
    setSelectedFiles([filePath]);
    void refetchCodeContent();
  };

  const handleSubmit = async (message: string) => {
    await append({ role: "user", content: message });
  };

  const navigateToFile = () => {
    if (focusedFile) {
      void router.push(
        `/dashboard/${org}/${repo}/code-visualizer?file=${focusedFile.file}`,
      );
    }
  };

  const shareFileSnippet = () => {
    if (focusedFile) {
      const shareableLink = `${window.location.origin}/dashboard/${org}/${repo}/code-visualizer?file=${focusedFile.file}`;
      void navigator.clipboard
        .writeText(shareableLink)
        .then(() => toast.success("Link copied to clipboard!"))
        .catch((err) => console.error("Failed to copy: ", err));
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex h-full w-full flex-row space-x-4">
      <div className="mx-auto flex max-w-5xl flex-1 flex-col overflow-clip rounded-md bg-white/50 p-4 shadow-sm dark:bg-slate-800">
        <div className="mb-1 w-full self-end p-1 text-right dark:bg-gray-800">
          <div className="relative flex items-center justify-end">
            <div className="relative z-10 -mt-2 mr-6 text-left">
              <SearchBar
                codebaseContext={contextItems}
                onSelectResult={handleSearchResultSelect}
              />
            </div>
            <div className="z-0">
              <ModelSelector selectedModel={model} onModelChange={setModel} />
            </div>
          </div>
        </div>
        {focusedFile && (
          <div className="mb-4 flex justify-end space-x-2">
            <button
              onClick={navigateToFile}
              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              Go to File
            </button>
            <button
              onClick={shareFileSnippet}
              className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
            >
              Share
            </button>
          </div>
        )}
        <div className="hide-scrollbar mb-4 flex-1 overflow-y-auto">
          {messages
            .filter((m) => m.role !== "tool")
            .filter((m) => m.content.length > 0)
            .map((m: Message, index: number) => (
              <ChatMessage
                key={m.id}
                isLast={index === messages.length - 1}
                isCreatingArtifact={isCreatingArtifact}
                showLoadingCard={showLoadingCard}
                fileName={
                  codeContent ? codeContent[0]?.path.split("/").pop() : null
                }
                message={m}
              />
            ))}
          {isLoading && !hasStartedStreaming && (
            <div className="flex justify-start">
              <div className="inline-block max-w-[80%] rounded-lg bg-white/20 p-2 text-dark-blue dark:bg-slate-700 dark:text-slate-100">
                <LoadingIndicator />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <SpeechToTextArea
          value={input}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          ref={textAreaRef}
        />
      </div>
      {artifactContent && (
        <Artifact
          content={artifactContent}
          fileName={artifactFileName}
          language={artifactLanguage}
          codeFiles={codeContent}
          filePath={artifactFilePath}
        />
      )}
    </div>
  );
}
