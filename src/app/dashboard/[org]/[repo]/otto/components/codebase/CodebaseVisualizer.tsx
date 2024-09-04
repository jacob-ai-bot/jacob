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
  const [detailsWidth, setDetailsWidth] = useState(30); // New state for details width
  const [allFiles, setAllFiles] = useState<string[]>([]);

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
    return contextItems.filter((item) => item.file.startsWith(prefix));
  }, [contextItems, currentPath]);

  const treeData = useMemo(() => {
    return processContextItems(filteredContextItems, currentPath);
  }, [filteredContextItems, currentPath]);

  const handleNodeClick = (path: string) => {
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
      // If it's a file, remove the last part to show its containing folder
      if (item.file?.includes(".")) {
        parts.pop();
      }
      setCurrentPath(parts);
    } else {
      // if the item isn't found, check to see if the path is a folder. Folders don't have extensions
      console.error("Item not found for path", path);
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
    return null; // or a loading spinner
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-blueGray-700">
      <div className="flex w-full flex-1 flex-row overflow-hidden">
        <div className="flex w-full flex-col">
          <div className="h-12 w-full flex-row bg-blueGray-900/30 p-2 text-left">
            {currentPath.map((part, index) => (
              <React.Fragment key={index}>
                <span className="text-blueGray-400">{index > 0 && " / "}</span>
                <button
                  className="text-blueGray-400 hover:text-blue-500 hover:underline"
                  onClick={() => handleBreadcrumbClick(index)}
                >
                  {part}
                </button>
              </React.Fragment>
            ))}
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
): FileType {
  const root: FileType = {
    name: currentPath[currentPath.length - 1] ?? "root",
    path: "/" + currentPath.slice(1).join("/"),
    size: 0,
    children: [],
  };

  contextItems.forEach((item) => {
    const parts = item.file
      .split("/")
      .filter(Boolean)
      .slice(currentPath.length - 1);
    let currentNode = root;

    parts.forEach((part, index) => {
      let child = currentNode.children?.find((c) => c.name === part);
      if (!child) {
        child = {
          name: part,
          path: currentPath
            .slice(1)
            .concat(parts.slice(0, index + 1))
            .join("/"),
          size: 0,
          children: [],
        };
        // before we push the child, make sure the file exists in the contextItems.files array
        // if it doesn't, don't push it
        const fileExists = contextItems.find((contextItem) =>
          contextItem.file?.includes(child?.path ?? ""),
        );
        if (fileExists) {
          currentNode.children?.push(child);
        }
      }
      if (index === parts.length - 1) {
        child.size = item.text?.length ?? 50;
        // If it's a file, remove the children array
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
