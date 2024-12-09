"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tree } from "./Tree";
import CodebaseDetails from "./CodebaseDetails";
import { type ContextItem } from "~/server/utils/codebaseContext";
import { type FileType } from "./types";
import SearchBar from "../../components/SearchBar";
import { startsWithIgnoreCase, includesIgnoreCase } from "~/app/utils";
import { api } from "~/trpc/react";
import Research from "../../todos/components/Research";
import LoadingIndicator from "../../components/LoadingIndicator";

interface CodebaseVisualizerProps {
  contextItems: ContextItem[];
  theme: "light" | "dark";
  org: string;
  repo: string;
  projectId?: number;
}

const HEADER_HEIGHT = 100;
const SIDEBAR_WIDTH = 64;
const DETAILS_WIDTH = 30;

export const CodebaseVisualizer: React.FC<CodebaseVisualizerProps> = ({
  contextItems,
  theme,
  org,
  repo,
  projectId,
}) => {
  const [selectedItem, setSelectedItem] = useState<ContextItem | null>(null);
  const [currentPath, setCurrentPath] = useState<string[]>(["root"]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const [detailsWidth, setDetailsWidth] = useState(DETAILS_WIDTH);
  const [allFiles, setAllFiles] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"folder" | "taxonomy" | "research">(
    "folder",
  );
  const [scalingMode, setScalingMode] = useState<"size" | "importance">("size");

  const { data: researchItems, isLoading: isLoadingResearch } =
    api.todos.getProjectResearch.useQuery(
      { projectId: projectId ?? 0, org, repo },
      { enabled: viewMode === "research" && !!projectId },
    );

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
        ? startsWithIgnoreCase(item.file, prefix)
        : startsWithIgnoreCase(item.taxonomy!, prefix);
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

      const item = contextItems.find((item) =>
        includesIgnoreCase(item.file, path),
      );
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
    } else if (viewMode === "taxonomy") {
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
        return includesIgnoreCase(taxonomy, path);
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

  const handleViewModeChange = (mode: "folder" | "taxonomy" | "research") => {
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
    <div className="flex h-full flex-col overflow-hidden rounded-md border border-aurora-100/50 bg-transparent shadow-lg dark:border-blueGray-900 dark:bg-blueGray-700">
      <div
        className={`flex w-full flex-1 flex-row ${
          viewMode === "research"
            ? "hide-scrollbar overflow-scroll"
            : "overflow-hidden"
        }`}
      >
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

              <div className="ml-4 flex space-x-2">
                <button
                  className={`rounded px-3 py-1 text-sm ${
                    scalingMode === "size"
                      ? "bg-aurora-500/50 text-gray-800 dark:bg-blueGray-600/40 dark:text-white"
                      : "text-gray-600 hover:bg-aurora-100/80 dark:text-blueGray-400 dark:hover:bg-blueGray-600/10"
                  }`}
                  onClick={() => setScalingMode("size")}
                >
                  Scale by Size
                </button>
                <button
                  className={`rounded px-3 py-1 text-sm ${
                    scalingMode === "importance"
                      ? "bg-aurora-500/50 text-gray-800 dark:bg-blueGray-600/40 dark:text-white"
                      : "text-gray-600 hover:bg-aurora-100/80 dark:text-blueGray-400 dark:hover:bg-blueGray-600/10"
                  }`}
                  onClick={() => setScalingMode("importance")}
                >
                  Scale by Importance
                </button>
              </div>
            </div>

            <div className="relative mr-6 flex items-center justify-end">
              {viewMode !== "research" && (
                <SearchBar
                  codebaseContext={contextItems}
                  onSelectResult={handleSearchResultSelect}
                  isDetailsExpanded={detailsWidth !== DETAILS_WIDTH}
                />
              )}
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
              <button
                className={`rounded px-3 py-1 text-sm ${
                  viewMode === "research"
                    ? "bg-aurora-500/50 text-gray-800 dark:bg-blueGray-600/40 dark:text-white"
                    : "text-gray-600 hover:bg-aurora-100/80 dark:text-blueGray-400 dark:hover:bg-blueGray-600/10"
                }`}
                onClick={() => handleViewModeChange("research")}
              >
                Research
              </button>
            </div>
          </div>
          <motion.div
            className="w-full py-8"
            initial={{ width: dimensions.width }}
            animate={{
              width:
                selectedItem && viewMode !== "research"
                  ? `${dimensions.width * ((100 - detailsWidth) / 100)}px`
                  : `${dimensions.width}px`,
            }}
            transition={{ duration: 0.3 }}
          >
            {viewMode === "research" ? (
              <div className="mx-auto w-full px-4 sm:max-w-xl md:max-w-3xl lg:max-w-5xl">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="rounded-lg bg-gradient-to-b from-sunset-50/70 to-50% p-4 shadow-md transition-all dark:from-sunset-800/30 dark:to-sunset-800/10 sm:p-6"
                >
                  <h1 className="text-xl font-bold sm:text-2xl">Research</h1>
                  <p className="mb-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                    JACoB dives into your codebase, analyzing structure, style,
                    and patterns to deliver smarter suggestions and tailor-made
                    solutions. It&apos;s like having a teammate who already
                    knows the ropes. Explore the examples below and click any
                    file name to view the code in action.
                  </p>
                  {isLoadingResearch ? (
                    <div className="flex items-center justify-center py-8">
                      <LoadingIndicator />
                    </div>
                  ) : researchItems && researchItems.length > 0 ? (
                    researchItems.map((item, index) => (
                      <Research
                        key={item.id}
                        item={item}
                        isLastItem={index === researchItems.length - 1}
                      />
                    ))
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-gray-600 dark:text-gray-400">
                        Research items are being generated. Please check again
                        in a few minutes.
                      </p>
                    </div>
                  )}
                </motion.div>
              </div>
            ) : (
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
                scalingMode={scalingMode}
              />
            )}
          </motion.div>
        </div>
        <AnimatePresence>
          {selectedItem && viewMode !== "research" && (
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

// Get circle size based on scaling mode
const getCircleSize = (
  text: string,
  importance: number,
  scalingMode: "size" | "importance",
): number => {
  return scalingMode === "size" ? Math.floor(text.length / 50) : importance;
};

// Calculate importance based on file type, dependencies, and git metrics
const calculateImportance = (item: ContextItem): number => {
  const fileTypeImportance = item.file?.endsWith("index.tsx") ? 10 : 1;
  const dependencyImportance = item.imports?.length ?? 0;
  const gitImportance = item.commits?.length ?? 0;
  return fileTypeImportance + dependencyImportance + gitImportance;
};

function processContextItems(
  contextItems: ContextItem[],
  currentPath: string[],
  viewMode: "folder" | "taxonomy" | "research",
): FileType {
  const root: FileType = {
    name: currentPath[currentPath.length - 1] ?? "root",
    path: "/" + currentPath.slice(1).join("/"),
    file: "/" + currentPath.slice(1).join("/"),
    taxonomy: "/" + currentPath.slice(1).join("/"),
    size: 0,
    children: [],
  };

  contextItems.forEach((item) => {
    // set the taxonomy to be the taxonomy string + the file (just the actual file name, not the path!)
    const taxonomy = item.taxonomy! + "/" + item.file?.split("/").pop() ?? "";
    const parts =
      viewMode === "folder"
        ? item.file
            .split("/")
            .filter(Boolean)
            .slice(currentPath.length - 1)
        : taxonomy
            ?.split("/")
            .filter(Boolean)
            .slice(currentPath.length - 1) ?? [];
    let currentNode = root;

    parts.forEach((part, index) => {
      let child = currentNode.children?.find(
        (c) => c.name.toLowerCase() === part.toLowerCase(),
      );
      if (!child) {
        child = {
          name: part,
          path:
            viewMode === "folder"
              ? currentPath
                  .slice(1)
                  .concat(parts.slice(0, index + 1))
                  .join("/")
              : parts.slice(0, index + 1).join("/"),
          size: getCircleSize(
            item.text ?? "",
            calculateImportance(item),
            scalingMode,
          ),
          value: getCircleSize(
            item.text ?? "",
            calculateImportance(item),
            scalingMode,
          ),
          importance: calculateImportance(item),
          file: item.file,
          taxonomy: taxonomy,
          children: [],
        };
        if (currentNode.children) {
          currentNode.children.push(child);
        }
      }
      if (index === parts.length - 1) {
        child.size = getCircleSize(
          item.text ?? "",
          calculateImportance(item),
          scalingMode,
        );
        child.value = getCircleSize(
          item.text ?? "",
          calculateImportance(item),
          scalingMode,
        );
        child.importance = calculateImportance(item);
        if (!item.file?.includes(".")) {
          delete child.children;
        }
      }
      currentNode = child;
    });
  });

  return root;
}

export default CodebaseVisualizer;
