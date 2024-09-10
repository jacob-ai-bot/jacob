import React, { useState, useEffect } from "react";
import { Editor } from "@monaco-editor/react";
import { DiffEditor } from "@monaco-editor/react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy, faCodeCommit } from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";

interface ArtifactProps {
  content: string;
  fileName: string;
  language: string;
}

export function Artifact({ content, fileName, language }: ArtifactProps) {
  const [showDiff, setShowDiff] = useState(false);
  const [originalContent, setOriginalContent] = useState("");

  useEffect(() => {
    // Simulate fetching original content
    // In a real scenario, you'd fetch this from your version control system
    setOriginalContent("// Original content\n// Will be fetched in the future");
  }, [fileName]);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  };

  const handleCreateCommit = () => {
    // TODO: Implement commit functionality
    toast.info("Create commit functionality coming soon!");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      className="flex h-full w-1/2 flex-col overflow-hidden rounded-lg bg-white shadow-lg dark:bg-slate-800"
    >
      <div className="flex items-center justify-between bg-aurora-100 p-4 dark:bg-sky-900">
        <h2 className="truncate text-lg font-semibold text-dark-blue dark:text-white">
          {fileName}
        </h2>
        <div className="flex-shrink-0 space-x-2">
          <button
            onClick={() => setShowDiff(!showDiff)}
            className="rounded bg-aurora-500 px-3 py-1 text-white transition-colors hover:bg-aurora-600"
          >
            {showDiff ? "Show Editor" : "Show Diff"}
          </button>
          <button
            onClick={copyToClipboard}
            className="rounded bg-aurora-500 p-2 text-white transition-colors hover:bg-aurora-600"
            title="Copy to clipboard"
          >
            <FontAwesomeIcon icon={faCopy} />
          </button>
          <button
            onClick={handleCreateCommit}
            className="rounded bg-aurora-500 p-2 text-white transition-colors hover:bg-aurora-600"
            title="Create commit"
          >
            <FontAwesomeIcon icon={faCodeCommit} />
          </button>
        </div>
      </div>
      <div className="flex-grow overflow-hidden">
        <AnimatePresence mode="wait">
          {showDiff ? (
            <motion.div
              key="diff"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <DiffEditor
                original={originalContent}
                modified={content}
                language={language}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <Editor
                value={content}
                language={language}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default Artifact;
