import React, { useState, useEffect } from "react";
import { Editor } from "@monaco-editor/react";
import { DiffEditor } from "@monaco-editor/react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy } from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import { useTheme } from "next-themes";
import MarkdownRenderer from "../../components/MarkdownRenderer";
import { type CodeFile } from "./Chat";
import { LiveProvider, LivePreview } from "react-live";

interface ArtifactProps {
  content: string;
  fileName: string;
  filePath: string;
  language: string;
  codeFiles: CodeFile[];
}

export function Artifact({
  content,
  fileName,
  filePath,
  language,
  codeFiles = [],
}: ArtifactProps) {
  const [activeTab, setActiveTab] = useState<
    "view" | "edit" | "diff" | "preview"
  >("view");
  const [originalContent, setOriginalContent] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  useEffect(() => {
    if (codeFiles.length > 0) {
      setOriginalContent(
        codeFiles.find((file) => file.path === filePath)?.content ?? null,
      );
    }
    console.log("codeFiles", codeFiles);
    console.log("filePath", filePath);
  }, [filePath, codeFiles]);

  const handleSave = () => {
    toast.info("Save functionality coming soon!");
  };

  console.log("content", content);
  console.log("originalContent", originalContent);

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
            <button
              onClick={() => setActiveTab("preview")}
              className={`px-3 py-2 text-sm font-medium ${
                activeTab === "preview"
                  ? "border-b-2 border-aurora-500 text-aurora-600"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              Preview
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
              <MarkdownRenderer className={`markdown-chat `}>
                {`\`\`\`${language}\n${content ?? originalContent}\n\`\`\``}
              </MarkdownRenderer>
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
          ) : activeTab === "preview" ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full overflow-auto bg-gray-50 dark:bg-[#282c34]"
            >
              <LiveProvider
                code={content ?? originalContent ?? ""}
                noInline
                theme={resolvedTheme === "dark" ? undefined : undefined}
              >
                <div className="p-4">
                  <LivePreview />
                </div>
              </LiveProvider>
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
