"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tree } from "./Tree";
import CodebaseDetails from "./CodebaseDetails";
import { type ContextItem } from "~/server/utils/codebaseContext";
import { type FileType } from "./types";

interface CodebaseVisualizerProps {
  contextItems: ContextItem[];
}

export const CodebaseVisualizer: React.FC<CodebaseVisualizerProps> = ({
  contextItems,
}) => {
  const [selectedItem, setSelectedItem] = useState<ContextItem | null>(null);
  const [currentPath, setCurrentPath] = useState<string[]>(["root"]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const [detailsWidth, setDetailsWidth] = useState(30);
  const [allFiles, setAllFiles] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"folder" | "taxonomy">("folder");

  useEffect(() => {
    setIsMounted(true);
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight * 0.7,
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

  const handleCloseDetails = () => {
    setSelectedItem(null);
  };

  const toggleDetailsWidth = () => {
    setDetailsWidth(detailsWidth === 30 ? 50 : 30);
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-blueGray-700">
      <div className="flex w-full flex-1 flex-row overflow-hidden">
        <div className="flex w-full flex-col">
          <div className="flex h-12 w-full flex-row items-center justify-between bg-blueGray-900/30 p-2 text-left">
            <div>
              {currentPath.map((part, index) => (
                <React.Fragment key={index}>
                  <span className="text-blueGray-400">
                    {index > 0 && " / "}
                  </span>
                  <button
                    className="text-blueGray-400 hover:text-blue-500 hover:underline"
                    onClick={() => handleBreadcrumbClick(index)}
                  >
                    {part}
                  </button>
                </React.Fragment>
              ))}
            </div>
            <button
              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
              onClick={() => {
                setViewMode(viewMode === "folder" ? "taxonomy" : "folder");
                setCurrentPath(["root"]);
                setSelectedItem(null);
              }}
            >
              {viewMode === "folder"
                ? "Switch to Taxonomy"
                : "Switch to Folder"}
            </button>
          </div>
          <motion.div
            className="tree-container py-8"
            initial={{ width: "100%" }}
            animate={{
              width: selectedItem ? `${100 - detailsWidth}%` : "100%",
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
            />
          </motion.div>
        </div>
        <AnimatePresence>
          {selectedItem && (
            <motion.div
              className="details-container w-full"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: `${detailsWidth}%`, opacity: 1 }}
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
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

function processContextItems(
  contextItems: ContextItem[],
  currentPath: string[],
  viewMode: "folder" | "taxonomy",
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
      let child = currentNode.children?.find((c) => c.name === part);
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
          size: 0,
          file: item.file,
          taxonomy: taxonomy,
          children: [],
        };
        if (currentNode.children) {
          currentNode.children.push(child);
        }
      }
      if (index === parts.length - 1) {
        child.size = item.text?.length ?? 50;
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
