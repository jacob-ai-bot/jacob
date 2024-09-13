import { type Message, useChat } from "ai/react";
import { useState, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import { type Project } from "~/server/db/tables/projects.table";
import { faClipboard } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { toast } from "react-toastify";
import { useTheme } from "next-themes";
import Artifact from "./Artifact"; // Import the new Artifact component
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { type ContextItem } from "~/server/utils/codebaseContext";
import { trpcClient } from "~/trpc/client";
import LoadingIndicator from "./LoadingIndicator";
import { LoadingCard } from "./LoadingCard";
import { type Evaluation } from "~/server/api/routers/chat";
import { api } from "~/trpc/react";

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

const CHAT_INPUT_HEIGHT = "40px";

import { motion, AnimatePresence } from "framer-motion";
import MarkdownRenderer from "~/app/_components/MarkdownRenderer";
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

  const [textareaHeight, setTextareaHeight] = useState(CHAT_INPUT_HEIGHT);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const evaluateChatMessage = api.chat.evaluateChatMessage.useMutation();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setHasStartedStreaming(false);
    setIsEvaluating(true);
    // get the text from the textarea
    const text = textareaRef.current?.value ?? "";
    // clear the textarea and append the new message
    textareaRef.current!.disabled = true;
    textareaRef.current!.style.height = CHAT_INPUT_HEIGHT;
    textareaRef.current!.style.opacity = "0.5";

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
      // wait a second and then set is creating artifact to true
      setTimeout(() => {
        setIsCreatingArtifact(true);
      }, 1000);
    }
    if (evaluation.filesToUse) {
      // call the github fetch files router
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
    setTextareaHeight(CHAT_INPUT_HEIGHT);
    textareaRef.current!.value = "";
    textareaRef.current!.disabled = false;
    textareaRef.current!.style.height = CHAT_INPUT_HEIGHT;
    textareaRef.current!.style.opacity = "1";
    textareaRef.current!.focus();
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange(e);
    adjustTextareaHeight();
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = CHAT_INPUT_HEIGHT;
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = scrollHeight + "px";
      setTextareaHeight(`${Math.min(scrollHeight, 200)}px`); // Max height of 200px
    }
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
  //   const CodeBlockComponent = ({
  //     inline,
  //     className,
  //     children,
  //     ...props
  //   }: any) => {
  //     const match = /language-(\w+)/.exec((className as string) ?? "");

  //     if (!inline && match) {
  //       return (
  //         <div className="relative w-full max-w-full overflow-hidden">
  //           <button
  //             className="absolute right-2 top-2 z-10 rounded bg-gray-300 px-2 py-1 text-blueGray-50 hover:bg-gray-400 dark:bg-gray-700/80 dark:text-white dark:hover:bg-gray-600/80"
  //             onClick={() => copyToClipboard(String(children))}
  //           >
  //             <FontAwesomeIcon icon={faClipboard} />
  //           </button>
  //           <Suspense fallback={<div>Loading...</div>}>
  //             <SyntaxHighlighter
  //               style={resolvedTheme === "dark" ? oneDark : oneLight}
  //               language={match[1]}
  //               PreTag="div"
  //               customStyle={{
  //                 margin: 0,
  //                 padding: "1rem 2.5rem 1rem 1rem",
  //                 whiteSpace: "pre-wrap",
  //                 wordBreak: "break-all",
  //                 overflowWrap: "break-word",
  //                 maxWidth: "100%",
  //               }}
  //               wrapLines={true}
  //               wrapLongLines={true}
  //               {...props}
  //             >
  //               {children}
  //             </SyntaxHighlighter>
  //           </Suspense>
  //         </div>
  //       );
  //     } else if (inline) {
  //       return (
  //         <code className={className} {...props}>
  //           {children}
  //         </code>
  //       );
  //     } else {
  //       return (
  //         <code className={className} {...props}>
  //           {children}
  //         </code>
  //       );
  //     }
  //   };
  //   CodeBlockComponent.displayName = "CodeBlock";
  //   return CodeBlockComponent;
  // }, [resolvedTheme]);

  // const memoizedRenderers = useMemo(() => {
  //   return {
  //     code: CodeBlock,
  //   };
  // }, [CodeBlock]);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="flex h-full w-full flex-row space-x-4">
      <div className="mx-auto flex  h-full w-full max-w-4xl  flex-row rounded-md bg-white/50 p-4 shadow-sm dark:bg-slate-800">
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
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await onSubmit(e);
            }}
            className="flex flex-col"
          >
            <div className="relative flex w-full items-center rounded-2xl border border-aurora-100 bg-aurora-50/30 p-1.5 dark:border-sky-600/30 dark:bg-slate-700">
              <textarea
                ref={textareaRef}
                className="hide-scrollbar m-0 flex-1 resize-none border-0 bg-transparent px-3 py-2 text-dark-blue focus:ring-0 focus-visible:ring-0 dark:text-slate-100"
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.metaKey) {
                    e.preventDefault();
                    void onSubmit(
                      e as unknown as React.FormEvent<HTMLFormElement>,
                    );
                  }
                }}
                placeholder="Type your message..."
                rows={1}
                style={{ height: textareaHeight }}
              />
              <button
                type="submit"
                className="mb-1 me-1 flex h-8 w-8 items-center justify-center rounded-full bg-aurora-500 text-white transition-colors hover:bg-aurora-600 focus-visible:outline-none disabled:bg-gray-300 dark:bg-sky-600 dark:hover:bg-sky-700 dark:disabled:bg-gray-600"
                disabled={!input.trim() || isLoading || isEvaluating}
                aria-label="Send message - or use cmd + enter"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M11.3939 6.67973C11.7286 6.34499 12.2714 6.34499 12.6061 6.67973L16.4633 10.537C16.798 10.8717 16.798 11.4145 16.4633 11.7492C16.1286 12.084 15.5857 12.084 15.251 11.7492L12.8571 9.35534V16.7143C12.8571 17.1877 12.4734 17.5714 12 17.5714C11.5266 17.5714 11.1429 17.1877 11.1429 16.7143V9.35534L8.74902 11.7492C8.41428 12.084 7.87144 12.084 7.53669 11.7492C7.20195 11.4145 7.20195 10.8717 7.53669 10.537L11.3939 6.67973Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </div>
          </form>
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
