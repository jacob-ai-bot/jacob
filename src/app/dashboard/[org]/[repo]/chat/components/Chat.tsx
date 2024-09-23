// Chat.tsx

import { useState, useEffect, useRef } from "react";
import { type Message, useChat } from "ai/react";
import { type Project } from "~/server/db/tables/projects.table";
import { toast } from "react-toastify";
import Artifact from "./Artifact";
import { type ContextItem } from "~/server/utils/codebaseContext";
import { trpcClient } from "~/trpc/client";
import LoadingIndicator from "../../components/LoadingIndicator";
import { LoadingCard } from "./LoadingCard";
import { type Evaluation } from "~/server/api/routers/chat";
import { api } from "~/trpc/react";
import { motion, AnimatePresence } from "framer-motion";
import MarkdownRenderer from "../../components/MarkdownRenderer";
import { SpeechToTextArea } from "../../components/SpeechToTextArea";

interface ChatProps {
  project: Project;
  contextItems: ContextItem[];
  org: string;
  repo: string;
}

export interface CodeFile {
  path: string;
  content: string;
}

export function Chat({ project, contextItems, org, repo }: ChatProps) {
  const [artifactContent, setArtifactContent] = useState<string | null>(null);
  const [artifactFileName, setArtifactFileName] = useState<string>("");
  const [artifactLanguage, setArtifactLanguage] = useState<string>("");
  const [hasStartedStreaming, setHasStartedStreaming] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [currentEvaluation, setCurrentEvaluation] = useState<Evaluation | null>(
    null,
  );
  const [artifactFilePath, setArtifactFilePath] = useState<string>("");
  const [isCreatingArtifact, setIsCreatingArtifact] = useState(false);
  const [showLoadingCard, setShowLoadingCard] = useState(false);
  const [codeFiles, setCodeFiles] = useState<CodeFile[]>([]);

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/chat/v2",
      body: {
        projectId: project.id,
        org,
        repo,
      },
      initialMessages: [
        {
          id: "1",
          role: "system",
          content:
            "Hi, I'm JACoB. I can answer questions about your codebase. Ask me anything!",
        },
      ],
      onResponse: async () => {
        setHasStartedStreaming(true);
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
      keepLastMessageOnError: true,
    });

  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const evaluateChatMessage = api.chat.evaluateChatMessage.useMutation();

  useEffect(() => setMounted(true), []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setHasStartedStreaming(false);
    setIsEvaluating(true);
    const text = input.trim();
    if (!text) return;

    const newMessage = {
      role: "user",
      content: text,
    };
    const newMessages = [...messages, newMessage];
    const evaluation = await evaluateChatMessage.mutateAsync({
      codeFileStructureContext: contextItems
        .map((item) => `${item.file} - ${item.overview}`)
        .join("\n"),
      messages: newMessages,
    });
    if (evaluation.shouldCreateArtifact) {
      setCurrentEvaluation(evaluation);
      setTimeout(() => {
        setIsCreatingArtifact(true);
      }, 1000);
    }
    if (evaluation.filesToUse) {
      const codeFileResponse =
        (await trpcClient.github.fetchFileContents.query({
          org,
          repo,
          branch: "main",
          filePaths: evaluation.filesToUse,
        })) ?? [];
      evaluation.codeFiles = codeFileResponse.map(
        (file) => `\`\`\` ${file.path}\n\n${file.content}\n\`\`\``,
      );

      setCodeFiles(
        codeFileResponse.map((file) => ({
          path: file.path ?? "",
          content: file.content ?? "",
        })),
      );
    }

    handleSubmit(e, {
      body: {
        evaluateChatMessageData: JSON.stringify(evaluation),
      },
    });

    setIsEvaluating(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isCreatingArtifact) {
      const timer = setTimeout(() => {
        setShowLoadingCard(true);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowLoadingCard(false);
    }
  }, [isCreatingArtifact]);

  if (!mounted) return null;

  return (
    <div className="flex h-full w-full flex-row space-x-4">
      <div className="mx-auto flex h-full w-full max-w-4xl flex-row overflow-clip rounded-md bg-white/50 p-4 shadow-sm dark:bg-slate-800">
        <div className="mx-auto mr-4 flex flex-1 flex-col">
          <div className="hide-scrollbar mb-4 flex-1 overflow-y-auto">
            {messages.map((m: Message, index: number) => (
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
                    m.role === "assistant" && (
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
            {(isLoading || isEvaluating) && !hasStartedStreaming && (
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
            onSubmit={onSubmit}
            isLoading={isLoading || isEvaluating}
          />
        </div>
      </div>
      {artifactContent && (
        <Artifact
          content={artifactContent}
          fileName={artifactFileName}
          language={artifactLanguage}
          codeFiles={codeFiles}
          filePath={artifactFilePath}
        />
      )}
    </div>
  );
}
