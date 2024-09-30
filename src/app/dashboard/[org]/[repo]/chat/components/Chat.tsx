// components/Chat.tsx
import { useState, useEffect, useRef } from "react";
import { type Message, useChat } from "ai/react";
import { type Project } from "~/server/db/tables/projects.table";
import { toast } from "react-toastify";
import Artifact from "./Artifact";
import { type ContextItem } from "~/server/utils/codebaseContext";
import LoadingIndicator from "../../components/LoadingIndicator";
import { LoadingCard } from "./LoadingCard";
import { type Evaluation } from "~/server/api/routers/chat";
import { motion, AnimatePresence } from "framer-motion";
import MarkdownRenderer from "../../components/MarkdownRenderer";
import { SpeechToTextArea } from "../../components/SpeechToTextArea";
import { type ChatModel, ChatModels, ModelSelector } from "./ModelSelector";
import SearchBar from "../../code-visualizer/codebase/SearchBar";
import { api } from "~/trpc/react";
import { getLanguageFromFile } from "~/app/utils";

interface ChatProps {
  project: Project;
  contextItems: ContextItem[];
  org: string;
  repo: string;
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

export function Chat({ project, contextItems, org, repo }: ChatProps) {
  const [artifactContent, setArtifactContent] = useState<string | null>(null);
  const [artifactFileName, setArtifactFileName] = useState<string>("");
  const [artifactLanguage, setArtifactLanguage] = useState<string>("");
  const [hasStartedStreaming, setHasStartedStreaming] = useState(false);
  const [currentEvaluation, setCurrentEvaluation] = useState<Evaluation | null>(
    null,
  );
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
    },
    initialMessages: savedMessages,
    onResponse: async () => {
      setHasStartedStreaming(true);
      setIsCreatingArtifact(true);
    },
    onError: (error) => {
      console.error("Error in chat", error);
      toast.error(`Error in chat: ${error.message}`);
    },
    onToolCall: async ({ toolCall }) => {
      console.log("toolCall", toolCall);
      setHasStartedStreaming(false);
      const toolCallArgs = toolCall.args as {
        fileName: string;
        content: string;
        language: string;
        filePath: string;
      };
      const { fileName, content, language, filePath } = toolCallArgs;
      setArtifactContent(content);
      setArtifactFileName(fileName);
      setArtifactLanguage(language);
      setArtifactFilePath(filePath);
    },
    onFinish: () => {
      setHasStartedStreaming(false);
      setIsCreatingArtifact(false);
      setCurrentEvaluation(null);
    },
  });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (model) {
      // when the model changes, move the messages from the previous model to the new model
      setSavedMessages(messages);
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
        <div className="hide-scrollbar mb-4 flex-1 overflow-y-auto">
          {messages
            .filter((m) => m.role !== "tool")
            .filter((m) => m.content.length > 0)
            .map((m: Message, index: number) => (
              <div
                key={m.id}
                className={`mb-4 flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`inline-block max-w-[80%] rounded-lg p-2 ${
                    m.role === "user"
                      ? "bg-aurora-50 text-dark-blue dark:bg-sky-500/40"
                      : "bg-white text-dark-blue dark:bg-slate-700 dark:text-slate-100"
                  }`}
                >
                  <MarkdownRenderer className={`markdown-chat px-1`}>
                    {m.content}
                  </MarkdownRenderer>
                  {isCreatingArtifact &&
                    index === messages.length - 1 &&
                    (m.role === "assistant" || m.role === "system") && (
                      <AnimatePresence>
                        {showLoadingCard && (
                          <motion.div
                            className="m-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <LoadingCard evaluation={currentEvaluation} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}
                </div>
              </div>
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
