import React, { useState, useMemo } from "react";
import {
  UncontrolledTreeEnvironment,
  Tree,
  StaticTreeDataProvider,
} from "react-complex-tree";
import "react-complex-tree/lib/style.css";
import { type CodeFile } from "./Chat";

interface FileMenuProps {
  codeFiles: CodeFile[];
  selectedFilePath: string;
  onFileSelect: (path: string) => void;
}

interface TreeItem {
  id: string;
  children?: string[];
  data: {
    title: string;
    isFolder: boolean;
    path: string;
  };
}

export function FileMenu({
  codeFiles,
  selectedFilePath,
  onFileSelect,
}: FileMenuProps) {
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const treeData = useMemo(() => {
    const items: Record<string, TreeItem> = {
      root: {
        id: "root",
        children: [],
        data: {
          title: "root",
          isFolder: true,
          path: "/",
        },
      },
    };

    codeFiles.forEach((file) => {
      const parts = file.path.split("/").filter(Boolean);
      let currentPath = "";
      let parentId = "root";

      parts.forEach((part, index) => {
        currentPath += "/" + part;
        const isLast = index === parts.length - 1;
        const itemId = currentPath;

        if (!items[itemId]) {
          items[itemId] = {
            id: itemId,
            data: {
              title: part,
              isFolder: !isLast,
              path: currentPath,
            },
          };

          if (!isLast) {
            items[itemId].children = [];
          }

          if (!items[parentId].children) {
            items[parentId].children = [];
          }
          items[parentId].children!.push(itemId);
        }

        parentId = itemId;
      });
    });

    return items;
  }, [codeFiles]);

  const handleSelect = (items: string[]) => {
    const selectedId = items[0];
    if (selectedId && !treeData[selectedId].data.isFolder) {
      onFileSelect(treeData[selectedId].data.path);
    }
  };

  return (
    <div className="h-full w-64 overflow-auto border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-slate-900">
      <UncontrolledTreeEnvironment
        dataProvider={
          new StaticTreeDataProvider(treeData, (item) => ({
            ...item,
          }))
        }
        getItemTitle={(item) => item.data.title}
        viewState={{
          ["tree-1"]: {
            expandedItems: expandedIds,
            selectedItems: [selectedFilePath],
          },
        }}
        onExpandItem={(item) => {
          setExpandedIds((prev) => [...prev, item.index]);
        }}
        onCollapseItem={(item) => {
          setExpandedIds((prev) => prev.filter((id) => id !== item.index));
        }}
        onSelectItems={handleSelect}
        renderItemTitle={({ title, item }) => (
          <span
            className={`flex items-center ${
              item.data.isFolder
                ? "font-medium text-gray-700 dark:text-gray-300"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            {title}
          </span>
        )}
      >
        <Tree treeId="tree-1" rootItem="root" />
      </UncontrolledTreeEnvironment>
    </div>
  );
}

export default FileMenu;
