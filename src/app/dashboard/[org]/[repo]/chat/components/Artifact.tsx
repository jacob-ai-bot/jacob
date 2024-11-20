import React, { useState, useEffect } from "react";
import { Editor } from "@monaco-editor/react";
import { DiffEditor } from "@monaco-editor/react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy } from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import { useTheme } from "next-themes";
import FileTree from "react-file-treeview";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.min.js";
import MarkdownRenderer from "../../components/MarkdownRenderer";
import { type CodeFile } from "./Chat";

interface ArtifactProps {
  content: string;
  fileName: string;
  filePath: string;
  language: string;
  codeFiles?: CodeFile[];
}

export function Artifact({
  content,
  fileName,
  filePath,
  language,
  codeFiles = [],
}: ArtifactProps) {
  const [activeTab, setActiveTab] = useState<"view" | "edit" | "diff">("view");
  const [originalContent, setOriginalContent] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string>(filePath);
  const [selectedContent, setSelectedContent] = useState<string>(content);
  const { resolvedTheme } = useTheme();

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  useEffect(() => {
    if (codeFiles.length > 0) {
      const foundContent =
        codeFiles.find((file) => file.path === selectedFile)?.content ?? null;
      setOriginalContent(
        foundContent && foundContent.trim() !== "" ? foundContent : null,
      );
      setSelectedContent(foundContent ?? content);
    }
  }, [selectedFile, codeFiles, content]);

  const handleSave = async () => {
    try {
      if ("showSaveFilePicker" in window) {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: "Text Files",
              accept: {
                "text/plain": [".txt", ".js", ".ts", ".jsx", ".tsx", ".md"],
              },
            },
          ],
        });
        const writable = await fileHandle.createWritable();
        await writable.write(selectedContent);
        await writable.close();
        toast.success("File saved successfully!");
      } else {
        const blob = new Blob([selectedContent], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success("File download started!");
      }
    } catch (error) {
      console.error("Error saving file:", error);
      if (error instanceof DOMException && error.name === "AbortError") {
        console.log("Save operation cancelled by user");
      } else {
        toast.error("Failed to save file. Please try again.");
      }
    }
  };

  const buildFileTree = (files: CodeFile[]) => {
    const root = {
      name: "root",
      id: "root",
      toggled: true,
      child: [],
    };

    const pathMap = new Map();
    pathMap.set("root", root);

    files.forEach((file) => {
      const parts = file.path.split("/").filter(Boolean);
      let currentPath = "root";
      let parent = root;

      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;
        const fullPath = `${currentPath}/${part}`;
        currentPath = fullPath;

        if (!pathMap.has(fullPath)) {
          const node = {
            name: part,
            id: fullPath,
            child: [],
            path: file.path,
          };

          parent.child.push(node);
          pathMap.set(fullPath, node);
        }

        if (!isFile) {
          parent = pathMap.get(fullPath);
        }
      });
    });

    return root;
  };

  const handleFileClick = (file: any) => {
    if (file.path) {
      setSelectedFile(file.path);
    }
  };

  const showDiffTab = originalContent !== null && originalContent.trim() !== "";

  return (
    <div className="flex h-full w-full gap-4">
      <div className="w-1/4 overflow-auto rounded-lg bg-white p-4 shadow-md dark:bg-slate-800">
        <FileTree
          data={buildFileTree(codeFiles)}
          action={{ fileOnClick: handleFileClick }}
          decorator={{
            showIcon: true,
            iconSize: 18,
            textSize: 15,
            showCollapseAll: true,
          }}
        />
      </div>
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        className="flex h-full w-3/4 flex-col overflow-hidden rounded-lg bg-white shadow-md dark:bg-slate-800"
      >
        <div className="border-b border-aurora-200 bg-aurora-50/50 shadow-sm dark:border-gray-700 dark:bg-slate-800">
          <div className="flex items-center justify-between px-4 py-2">
            <h2 className="truncate text-sm font-medium text-gray-700 dark:text-gray-200">
              {selectedFile.split("/").pop() || fileName}
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
              {showDiffTab && (
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
              )}
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
                  {`\`\`\`${language}\n${selectedContent ?? originalContent}\n\`\`\``}
                </MarkdownRenderer>
              </motion.div>
            ) : activeTab === "diff" && showDiffTab ? (
              <motion.div
                key="diff"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full"
              >
                <DiffEditor
                  original={originalContent ?? ""}
                  modified={selectedContent}
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
                  value={selectedContent}
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
            onClick={() => copyToClipboard(selectedContent)}
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
    </div>
  );
}

export default Artifact;

