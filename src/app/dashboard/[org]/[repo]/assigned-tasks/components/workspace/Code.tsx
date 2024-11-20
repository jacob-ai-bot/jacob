import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboard } from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import MarkdownRenderer from "../../../components/MarkdownRenderer";
import { removeMarkdownCodeblocks } from "~/app/utils";
import { type Code } from "~/server/api/routers/events";
import { useTheme } from "next-themes";
import { DiffEditor } from "@monaco-editor/react";
import { api } from "~/trpc/react";

type CodeComponentProps = {
  codeFiles?: Code[];
  org: string;
  repo: string;
  branch?: string;
};

export const CodeComponent: React.FC<CodeComponentProps> = ({
  codeFiles,
  org,
  repo,
  branch = "main",
}) => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [activeModeTab, setActiveModeTab] = useState<"view" | "diff">("view");
  const [shouldShowDiff, setShouldShowDiff] = useState<boolean>(true);
  const { resolvedTheme } = useTheme();

  const { data: fileContents, isLoading } =
    api.github.fetchFileContents.useQuery({
      org,
      repo,
      branch,
      filePaths: codeFiles?.map((file) => file.filePath) ?? [],
      shouldThrow: false,
    });

  useEffect(() => {
    if (fileContents && fileContents.length > 0) {
      if (fileContents.length > activeTab) {
        if (fileContents[activeTab]?.content) {
          setShouldShowDiff(true);
        } else {
          setShouldShowDiff(false);
          setActiveModeTab("view");
        }
      }
    }
  }, [fileContents, activeTab]);

  console.log("fileContents", fileContents);
  console.log(
    "filePaths",
    codeFiles?.map((file) => file.filePath),
  );

  const handleTabClick = (index: number) => {
    setActiveTab(index);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch (err) {
      toast.error("Failed to copy to clipboard");
    }
  };

  if (!codeFiles || codeFiles.length === 0) {
    return (
      <p className="text-center text-gray-500 dark:text-gray-400">
        No code files to display
      </p>
    );
  }

  return (
    <div className="flex flex-col rounded-lg bg-gradient-to-b from-aurora-50/70 to-30% px-6 pb-6 pt-2 shadow-md transition-all dark:from-aurora-800/80 dark:to-aurora-800/20 dark:shadow-blueGray-800/80">
      <div
        className={`hide-scrollbar overflow-x-auto border-gray-200 dark:border-blueGray-500/80 ${
          codeFiles?.length > 1 ? "border-b" : "border-b-0"
        }`}
      >
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          {codeFiles.map((file, index) => (
            <button
              key={index}
              className={`whitespace-nowrap ${codeFiles?.length > 1 ? "border-b-2" : "border-b-0"} px-1 pb-1 pt-3 text-sm font-medium ${
                activeTab === index
                  ? "border-aurora-800 text-aurora-800 dark:border-aurora-400 dark:text-aurora-400"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:text-gray-500"
              }`}
              onClick={() => handleTabClick(index)}
            >
              {file.fileName?.split("/").pop() ?? `File ${index + 1}`}
            </button>
          ))}
        </nav>
      </div>

      <div className="mr-4 mt-3 flex w-full items-center justify-end space-x-2">
        <div className="mr-2 flex w-full justify-between">
          <p className="ml-1 mt-2 text-xs text-gray-500 dark:text-gray-300">
            {codeFiles[activeTab]?.filePath ?? ""}
          </p>
          <div className="flex flex-row space-x-2">
            <button
              onClick={() => setActiveModeTab("view")}
              className={`rounded-t-md px-4 py-1 text-sm font-medium ${
                activeModeTab === "view"
                  ? "bg-aurora-500 text-white dark:bg-aurora-600/50"
                  : "bg-aurora-800/10 text-gray-500 hover:text-gray-700 dark:bg-gray-800/80 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              Code
            </button>
            {shouldShowDiff && (
              <button
                onClick={() => setActiveModeTab("diff")}
                className={`rounded-t-md px-4 py-1 text-sm font-medium ${
                  activeModeTab === "diff"
                    ? "bg-aurora-500 text-white dark:bg-aurora-600/50"
                    : "bg-aurora-800/10 text-gray-500 hover:text-gray-700 dark:bg-gray-800/80 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                Diff
              </button>
            )}
          </div>
        </div>
      </div>
      {activeModeTab === "view" ? (
        <div className="markdown-code relative flex-grow overflow-hidden">
          <button
            className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded text-blueGray-500 hover:text-blueGray-400"
            onClick={() =>
              copyToClipboard(codeFiles[activeTab]?.codeBlock ?? "")
            }
            title="Copy to Clipboard"
          >
            <FontAwesomeIcon icon={faClipboard} size="sm" />
          </button>

          <MarkdownRenderer className="markdown-chat h-full overflow-clip rounded-lg border border-aurora-500/30 bg-gray-50 dark:bg-[#282c33]">
            {`\`\`\` ${codeFiles[activeTab]?.language?.toLocaleLowerCase() ?? "javascript"}\n${removeMarkdownCodeblocks(
              codeFiles[activeTab]?.codeBlock ?? "",
            )}\n\`\`\``}
          </MarkdownRenderer>
        </div>
      ) : (
        <div className="flex h-[calc(100vh-326px)]">
          <DiffEditor
            original={
              fileContents && fileContents.length > activeTab && !isLoading
                ? fileContents[activeTab]?.content
                : ""
            }
            modified={removeMarkdownCodeblocks(
              codeFiles[activeTab]?.codeBlock ?? "",
            )}
            language={
              codeFiles[activeTab]?.language?.toLocaleLowerCase() ??
              "javascript"
            }
            className="overflow-clip rounded-lg border border-aurora-500/30 bg-gray-50 dark:bg-[#282c33]"
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
              wordWrap: "on",
              wordWrapColumn: 140,
            }}
          />
        </div>
      )}
    </div>
  );
};

export default CodeComponent;
