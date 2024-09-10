import { type Message, useChat } from "ai/react";
import { useState, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import { type Project } from "~/server/db/tables/projects.table";
import gfm from "remark-gfm";
import Markdown from "react-markdown";
import { faClipboard } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { toast } from "react-toastify";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import Artifact from "./Artifact"; // Import the new Artifact component

// Lazy load SyntaxHighlighter
const SyntaxHighlighter = lazy(() =>
  import("react-syntax-highlighter").then((module) => ({
    default: module.Prism,
  })),
);
const oneDark = lazy(() =>
  // @ts-ignore
  import("react-syntax-highlighter/dist/cjs/styles/prism").then((module) => ({
    default: module.oneDark,
  })),
);
const oneLight = lazy(() =>
  // @ts-ignore
  import("react-syntax-highlighter/dist/cjs/styles/prism").then((module) => ({
    default: module.oneLight,
  })),
);

interface ChatProps {
  project: Project;
}

const copyToClipboard = async (text: string) => {
  await navigator.clipboard.writeText(text);
  toast.success("Copied to clipboard");
};

const CHAT_INPUT_HEIGHT = "40px";

export function Chat({ project }: ChatProps) {
  const [artifactContent, setArtifactContent] = useState<string | null>("test");
  const [artifactFileName, setArtifactFileName] = useState<string>("");
  const [artifactLanguage, setArtifactLanguage] = useState<string>("");
  const [hasStartedStreaming, setHasStartedStreaming] = useState(false);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setMessages,
  } = useChat({
    api: "/api/chat/v2",
    body: {
      projectId: project.id,
    },
    initialMessages: [
      {
        id: "1",
        role: "system",
        content:
          "Hi, I'm JACoB. I can answer questions about your codebase. Ask me anything!",
      },
    ],
    onResponse: async (response: Response) => {
      setHasStartedStreaming(true);
      return;
      const reader = response.body?.getReader();
      if (!reader) return;

      let accumulatedContent = "";
      const newMessageId = Date.now().toString();

      const updateMessage = (content: string) => {
        // remove any content between <jacobThinking> and </jacobArtifact>
        content = content.replace(
          /<jacobThinking>[\s\S]*?<\/jacobArtifact>/g,
          "",
        );

        setMessages((currentMessages) => {
          const updatedMessages = [...currentMessages];
          const lastMessage = updatedMessages[updatedMessages.length - 1];

          if (lastMessage && lastMessage.role === "assistant") {
            lastMessage.content = content;
          } else {
            updatedMessages.push({
              id: newMessageId,
              role: "assistant",
              content: content,
            });
          }
          // be sure that the last message's content update is returned
          return updatedMessages;
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const parts = chunk.split("\n");

        for (const part of parts) {
          // do a quick timeout to prevent the chat from freezing
          // await new Promise((resolve) => setTimeout(resolve, 100));
          if (part.trim() === "") continue;

          const match = part.match(/^(\d+):"(.+)"$/);
          if (match) {
            const [, index, content] = match;
            // json parse the content to remove extra characters like \n and \t
            const parsedContent = content ?? ""; // TODO: fix this
            switch (index) {
              case "0": // text stream
                accumulatedContent += parsedContent;
                updateMessage(accumulatedContent);

                if (accumulatedContent.includes("<jacobThinking>")) {
                  setHasStartedStreaming(false);
                }
                if (accumulatedContent.includes("</jacobArtifact>")) {
                  setHasStartedStreaming(true);
                }
                break;
              case "1": // data stream
                console.log(part); // TODO: NEVER REMOVE THIS, but will be created in a few minutes...
                break;
              default:
                break;
            }
          }
        }
      }

      // Parse for artifact tags
      const artifactRegex = /<jacobArtifact[^>]*>([\s\S]*?)<\/jacobArtifact>/;
      console.log("accumulatedContent", accumulatedContent);
      const match = accumulatedContent.match(artifactRegex);
      console.log("match", match);

      if (match) {
        const artifactContent = match[1];
        const titleMatch = accumulatedContent.match(/title="([^"]*)"/) ?? [
          "",
          "Untitled",
        ];
        const typeMatch = accumulatedContent.match(/type="([^"]*)"/) ?? [
          "",
          "",
        ];

        setArtifactFileName(titleMatch[1] ?? "Untitled");
        setArtifactLanguage(typeMatch[1]?.split(".").pop() ?? "javascript");
        setArtifactContent(artifactContent ?? null);
      }
    },
    onFinish: () => {
      setHasStartedStreaming(false);
    },
  });

  const [textareaHeight, setTextareaHeight] = useState(CHAT_INPUT_HEIGHT);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    setHasStartedStreaming(false);
    e.preventDefault();
    handleSubmit();
    setTextareaHeight(CHAT_INPUT_HEIGHT);
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

  const CodeBlock = useMemo(() => {
    const CodeBlockComponent = ({
      inline,
      className,
      children,
      ...props
    }: any) => {
      const match = /language-(\w+)/.exec((className as string) ?? "");
      if (!inline && match) {
        return (
          <div className="relative w-full max-w-full overflow-hidden">
            <button
              className="absolute right-2 top-2 z-10 rounded bg-gray-300 px-2 py-1 text-blueGray-50 hover:bg-gray-400 dark:bg-gray-700/80 dark:text-white dark:hover:bg-gray-600/80"
              onClick={() => copyToClipboard(String(children))}
            >
              <FontAwesomeIcon icon={faClipboard} />
            </button>
            <Suspense fallback={<div>Loading...</div>}>
              <SyntaxHighlighter
                style={resolvedTheme === "dark" ? oneDark : oneLight}
                language={match[1]}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  padding: "1rem 2.5rem 1rem 1rem",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                  overflowWrap: "break-word",
                  maxWidth: "100%",
                }}
                wrapLines={true}
                wrapLongLines={true}
                {...props}
              >
                {children}
              </SyntaxHighlighter>
            </Suspense>
          </div>
        );
      } else if (inline) {
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      } else {
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      }
    };
    CodeBlockComponent.displayName = "CodeBlock";
    return CodeBlockComponent;
  }, [resolvedTheme]);

  const memoizedRenderers = useMemo(() => {
    return {
      code: CodeBlock,
    };
  }, [CodeBlock]);

  useEffect(() => setMounted(true), []);

  const LoadingIndicator = () => (
    <div className="flex items-center justify-center space-x-2 p-2">
      {[
        { light: "#BBDEFB", dark: "#B2EBF2" },
        { light: "#FFCCBC", dark: "#D1C4E9" },
        { light: "#B2DFDB", dark: "#E0E7FF" },
      ].map((colors, index) => (
        <motion.div
          key={index}
          className={`h-3 w-3 rounded-full bg-[${colors.light}] dark:bg-[${colors.dark}]`}
          animate={{
            y: ["0%", "-50%", "0%"],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: index * 0.15,
          }}
        />
      ))}
    </div>
  );

  if (!mounted) return null;

  return (
    <div className="flex h-full w-full flex-row space-x-4">
      <div className="mx-auto flex  h-full w-full max-w-4xl  flex-row rounded-md bg-white/50 p-4 shadow-sm dark:bg-slate-800">
        <div className="mx-auto mr-4 flex flex-1 flex-col">
          <div className="hide-scrollbar mb-4 flex-1 overflow-y-auto">
            {messages.map((m: Message) => (
              <div
                key={m.id}
                className={`mb-4 flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`inline-block max-w-[80%] rounded-lg p-2 ${
                    m.role === "user"
                      ? "bg-aurora-50 text-white dark:bg-sky-500/40"
                      : "bg-white text-dark-blue dark:bg-slate-700 dark:text-slate-100"
                  }`}
                >
                  <Markdown
                    remarkPlugins={[gfm]}
                    className={`markdown-chat px-1`}
                    components={memoizedRenderers}
                  >
                    {m.content}
                  </Markdown>
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
          <form onSubmit={onSubmit} className="flex flex-col">
            <div className="relative flex w-full items-center rounded-2xl border border-aurora-100 bg-aurora-50/30 p-1.5 dark:border-sky-600/30 dark:bg-slate-700">
              <textarea
                ref={textareaRef}
                className="hide-scrollbar m-0 flex-1 resize-none border-0 bg-transparent px-3 py-2 text-dark-blue focus:ring-0 focus-visible:ring-0 dark:text-slate-100"
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.metaKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Type your message..."
                rows={1}
                style={{ height: textareaHeight }}
              />
              <button
                type="submit"
                className="mb-1 me-1 flex h-8 w-8 items-center justify-center rounded-full bg-aurora-500 text-white transition-colors hover:bg-aurora-600 focus-visible:outline-none disabled:bg-gray-300 dark:bg-sky-600 dark:hover:bg-sky-700 dark:disabled:bg-gray-600"
                disabled={!input.trim() || isLoading}
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
        />
      )}
    </div>
  );
}
