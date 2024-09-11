import React, {
  useState,
  useEffect,
  useMemo,
  Suspense,
  useCallback,
} from "react";
import { Editor } from "@monaco-editor/react";
import { DiffEditor } from "@monaco-editor/react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy } from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import { useTheme } from "next-themes";
import Markdown from "react-markdown";
import gfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

interface ArtifactProps {
  content: string;
  fileName: string;
  language: string;
}

export function Artifact({ content, fileName, language }: ArtifactProps) {
  const [activeTab, setActiveTab] = useState<"view" | "edit" | "diff">("view");
  const [originalContent, setOriginalContent] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setOriginalContent(content.replace("import", "require"));
  }, [fileName]);

  const copyToClipboard = useCallback(async (textToCopy: string) => {
    await navigator.clipboard.writeText(textToCopy);
    toast.success("Copied to clipboard");
  }, []);

  const handleSave = () => {
    toast.info("Save functionality coming soon!");
  };

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
            <Suspense fallback={<div>Loading...</div>}>
              <SyntaxHighlighter
                style={resolvedTheme === "dark" ? oneDark : oneLight}
                language={match[1]}
                PreTag="div"
                customStyle={{
                  margin: 0,
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

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      className="flex h-full w-1/2 flex-col overflow-hidden rounded-lg bg-white shadow-md dark:bg-slate-800"
    >
      <div className="border-b border-aurora-200 bg-aurora-50/50 shadow-sm dark:border-gray-700 dark:bg-slate-800">
        <div className="flex items-center justify-between px-4 py-2">
          <h2 className="truncate text-sm font-medium text-gray-700 dark:text-gray-200">
            {fileName}
          </h2>
          <div className="flex">
            <button
              onClick={() => setActiveTab("view")}
              className={`px-3 py-2 text-sm font-medium ${
                activeTab === "view"
                  ? "border-b-2 border-aurora-500 text-aurora-600"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              View
            </button>
            <button
              onClick={() => setActiveTab("edit")}
              className={`px-3 py-2 text-sm font-medium ${
                activeTab === "edit"
                  ? "border-b-2 border-aurora-500 text-aurora-600"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              Edit
            </button>
            <button
              onClick={() => setActiveTab("diff")}
              className={`px-3 py-2 text-sm font-medium ${
                activeTab === "diff"
                  ? "border-b-2 border-aurora-500 text-aurora-600"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              Diff
            </button>
          </div>
        </div>
      </div>
      <div className="flex-grow overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === "view" ? (
            <motion.div
              key="view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full overflow-auto bg-gray-50 dark:bg-[#282c34]"
            >
              <Markdown
                remarkPlugins={[gfm]}
                className={`markdown-chat `}
                components={memoizedRenderers}
              >
                {`\`\`\`${language}\n${content ?? originalContent}\n\`\`\``}
              </Markdown>
            </motion.div>
          ) : activeTab === "diff" ? (
            <motion.div
              key="diff"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <DiffEditor
                original={originalContent ?? ""}
                modified={content}
                language={language}
                theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  selectionHighlight: false,
                  scrollbar: {
                    vertical: "hidden",
                    horizontal: "hidden",
                  },
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="edit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <Editor
                value={content}
                language={language}
                theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
                options={{
                  minimap: { enabled: false },
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  selectionHighlight: false,
                  scrollbar: {
                    vertical: "hidden",
                    horizontal: "hidden",
                  },
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-end space-x-2 border-t border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-slate-800">
        <button
          onClick={() => copyToClipboard(content)}
          className="rounded p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          title="Copy to clipboard"
        >
          <FontAwesomeIcon icon={faCopy} />
        </button>
        <button
          onClick={handleSave}
          className="rounded bg-aurora-500 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-aurora-600"
        >
          Save
        </button>
      </div>
    </motion.div>
  );
}

export default Artifact;
