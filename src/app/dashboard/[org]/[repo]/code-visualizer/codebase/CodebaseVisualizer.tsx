"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tree } from "./Tree";
import CodebaseDetails from "./CodebaseDetails";
import { type ContextItem } from "~/server/utils/codebaseContext";
import { type FileType } from "./types";
import SearchBar from "../../components/SearchBar";

interface CodebaseVisualizerProps {
  contextItems: ContextItem[];
  theme: "light" | "dark";
  org: string;
  repo: string;
}

const HEADER_HEIGHT = 100;
const SIDEBAR_WIDTH = 64;
const DETAILS_WIDTH = 30;

export const CodebaseVisualizer: React.FC<CodebaseVisualizerProps> = ({
  contextItems,
  theme,
  org,
  repo,
}) => {
  const [selectedItem, setSelectedItem] = useState<ContextItem | null>(null);
  const [currentPath, setCurrentPath] = useState<string[]>(["root"]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const [detailsWidth, setDetailsWidth] = useState(DETAILS_WIDTH);
  const [allFiles, setAllFiles] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"folder" | "taxonomy">("folder");

  useEffect(() => {
    setIsMounted(true);
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth - SIDEBAR_WIDTH,
        height: (window.innerHeight - HEADER_HEIGHT) * 0.7,
      });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    const files = contextItems.map((item) => item.file);
    setAllFiles(files);
  }, [contextItems]);

  const filteredContextItems = useMemo(() => {
    const prefix = "/" + currentPath.slice(1).join("/");
    return contextItems.filter((item) => {
      return viewMode === "folder"
        ? item.file.startsWith(prefix)
        : item.taxonomy!.startsWith(prefix) ?? false;
    });
  }, [contextItems, currentPath, viewMode]);

  const treeData = useMemo(() => {
    return processContextItems(filteredContextItems, currentPath, viewMode);
  }, [filteredContextItems, currentPath, viewMode]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleNodeClick = (path: string) => {
    if (viewMode === "folder") {
      const folder = path
        .split("/")
        .filter(Boolean)
        .find((part) => !part.includes("."));
      if (folder) {
        setCurrentPath([...path.split("/").filter(Boolean)]);
      }

      const item = contextItems.find((item) => item.file?.includes(path));
      if (item) {
        setSelectedItem(item);
        const parts = ["root", ...path.split("/").filter(Boolean)];
        if (item.file?.includes(".")) {
          parts.pop();
        }
        setCurrentPath(parts);
      } else {
        console.error("Item not found for path", path);
      }
    } else {
      const folder = path
        .split("/")
        .filter(Boolean)
        .find((part) => !part.includes("."));
      if (folder) {
        setCurrentPath([...path.split("/").filter(Boolean)]);
      }
      const item = contextItems.find((item) => {
        const taxonomy =
          item.taxonomy! + "/" + item.file?.split("/").pop() ?? "";
        return taxonomy?.includes(path);
      });
      if (item) {
        setSelectedItem(item);
        const taxonomy =
          item.taxonomy! + "/" + item.file?.split("/").pop() ?? "";
        const parts = ["root", ...taxonomy.split("/").filter(Boolean)];

        if (item.file?.includes(".")) {
          parts.pop();
        }
        setCurrentPath(parts);
      } else {
        console.error("Item not found for taxonomy path", path);
      }
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    setCurrentPath(currentPath.slice(0, index + 1));
    setSelectedItem(null);
  };

  const handleViewModeChange = (mode: "folder" | "taxonomy") => {
    setViewMode(mode);
    setCurrentPath(["root"]);
    setSelectedItem(null);
  };

  const handleCloseDetails = () => {
    setSelectedItem(null);
  };

  const toggleDetailsWidth = () => {
    setDetailsWidth(detailsWidth === 30 ? 50 : 30);
  };

  const handleSearchResultSelect = useCallback(
    (filePath: string) => {
      handleNodeClick(filePath);
    },
    [handleNodeClick],
  );

  if (!isMounted) {
    return null;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md border border-aurora-100/50 bg-transparent  shadow-lg dark:border-blueGray-900 dark:bg-blueGray-700">
      <div className="flex w-full flex-1 flex-row overflow-hidden">
        <div className="flex w-full flex-col">
          <div className="flex h-12 w-full flex-row items-center justify-between bg-aurora-100/50 p-2 text-left dark:bg-blueGray-900/30">
            <div className="flex flex-grow items-center">
              {currentPath.map((part, index) => (
                <React.Fragment key={index}>
                  <span className="text-gray-500 dark:text-blueGray-400">
                    {index > 0 && " / "}
                  </span>
                  <button
                    className="text-gray-600 hover:text-blue-500 hover:underline dark:text-blueGray-400"
                    onClick={() => handleBreadcrumbClick(index)}
                  >
                    {part?.replaceAll("_", " ")}
                  </button>
                </React.Fragment>
              ))}
            </div>

            <div className="relative mr-6 flex items-center justify-end">
              <SearchBar
                codebaseContext={contextItems}
                onSelectResult={handleSearchResultSelect}
                isDetailsExpanded={detailsWidth !== DETAILS_WIDTH}
              />
            </div>
            <div className="flex space-x-2">
              <button
                className={`rounded px-3 py-1 text-sm ${
                  viewMode === "folder"
                    ? "bg-aurora-500/50 text-gray-800 dark:bg-blueGray-600/40 dark:text-white"
                    : "text-gray-600 hover:bg-aurora-100/80 dark:text-blueGray-400 dark:hover:bg-blueGray-600/10"
                }`}
                onClick={() => handleViewModeChange("folder")}
              >
                Folder
              </button>
              <button
                className={`rounded px-3 py-1 text-sm ${
                  viewMode === "taxonomy"
                    ? "bg-aurora-500/50 text-gray-800 dark:bg-blueGray-600/40 dark:text-white"
                    : "text-gray-600 hover:bg-aurora-100/80 dark:text-blueGray-400 dark:hover:bg-blueGray-600/10"
                }`}
                onClick={() => handleViewModeChange("taxonomy")}
              >
                Architecture
              </button>
            </div>
          </div>
          <motion.div
            className="w-full py-8"
            initial={{ width: dimensions.width }}
            animate={{
              width: selectedItem
                ? `${dimensions.width * ((100 - detailsWidth) / 100)}px`
                : `${dimensions.width}px`,
            }}
            transition={{ duration: 0.3 }}
          >
            <Tree
              data={treeData}
              maxDepth={12}
              colorEncoding="type"
              filesChanged={[]}
              customFileColors={{}}
              onNodeClick={handleNodeClick}
              width={
                selectedItem
                  ? dimensions.width * ((100 - detailsWidth) / 100)
                  : dimensions.width
              }
              height={dimensions.height}
              selectedItem={selectedItem}
              selectedFolder={"/" + currentPath?.join("/")}
              viewMode={viewMode}
              theme={theme}
            />
          </motion.div>
        </div>
        <AnimatePresence>
          {selectedItem && (
            <motion.div
              className={`hide-scrollbar w-[${dimensions.width * (detailsWidth / 100)}px] overflow-hidden`}
              initial={{ width: 0, opacity: 0 }}
              animate={{
                width: `${dimensions.width * (detailsWidth / 100)}px`,
                opacity: 1,
              }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CodebaseDetails
                item={selectedItem}
                onClose={handleCloseDetails}
                onToggleWidth={toggleDetailsWidth}
                isExpanded={detailsWidth === 50}
                allFiles={allFiles}
                onNodeClick={handleNodeClick}
                viewMode={viewMode}
                theme={theme}
                org={org}
                repo={repo}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

function getCircleSize(text: string) {
  return Math.floor(text.length / 50) + 1