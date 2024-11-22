import { ChevronRightIcon, FolderIcon } from "@heroicons/react/24/outline";
import { DocumentIcon } from "@heroicons/react/24/outline";
import React, { useState, useMemo } from "react";
import {
  UncontrolledTreeEnvironment,
  Tree,
  StaticTreeDataProvider,
  type TreeItemIndex,
} from "react-complex-tree";
import { ContextItem } from "~/server/utils/codebaseContext";

interface FileMenuProps {
  filePaths: string[];
  selectedFilePath: string;
  onFileSelect: (path: string) => void;
}

interface TreeItem {
  id: string;
  children?: string[];
  data: {
    title: string;
    path: string;
  };
  isFolder: boolean;
  index: string;
}

export function FileMenu({
  filePaths = [],
  selectedFilePath,
  onFileSelect,
}: FileMenuProps) {
  const [expandedIds, setExpandedIds] = useState<string[]>(() => {
    const parts = selectedFilePath.split("/").filter(Boolean);
    const paths: string[] = [];
    let currentPath = "";

    parts.forEach((part, index) => {
      if (index === parts.length - 1) return;
      currentPath += "/" + part;
      paths.push(currentPath);
    });

    return paths;
  });

  const treeData = useMemo(() => {
    const items: Record<string, TreeItem> = {
      root: {
        id: "root",
        children: [],
        data: {
          title: "root",
          path: "/",
        },
        isFolder: true,
        index: "root",
      },
    };

    filePaths.forEach((path) => {
      const parts = path.split("/").filter(Boolean);
      let currentPath = "";
      let parentId = "root";
      parts.forEach((part, index) => {
        currentPath += "/" + part;
        const isLast = index === parts.length - 1;
        const itemId = currentPath;

        if (!items[itemId]) {
          items[itemId] = {
            id: itemId,
            children: isLast ? undefined : [],
            data: {
              title: part,
              path: currentPath,
            },
            isFolder: !isLast,
            index: itemId,
          };

          const parent = items[parentId];
          if (parent && !parent.children) {
            parent.children = [];
          }
          if (parent?.children) {
            parent.children.push(itemId);
          }
        }

        parentId = itemId;
      });
    });

    return items;
  }, [filePaths]);

  const handleSelect = (_items: TreeItemIndex[], _treeId: string) => {
    const selectedId = _items[0] as string;
    const selectedItem = treeData[selectedId];
    if (selectedId && selectedItem && !selectedItem.isFolder) {
      onFileSelect(selectedItem.data.path);
    }
  };

  return (
    <div className="hide-scrollbar -mr-1 mt-0.5 h-full w-64 overflow-scroll rounded-l-md border-r border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900">
      <UncontrolledTreeEnvironment
        dataProvider={new StaticTreeDataProvider(treeData)}
        getItemTitle={(item) => item.data.title}
        viewState={{
          ["tree-1"]: {
            expandedItems: expandedIds,
            selectedItems: [selectedFilePath],
          },
        }}
        onExpandItem={(item) => {
          setExpandedIds((prev) => [...prev, item.index as string]);
        }}
        onCollapseItem={(item) => {
          setExpandedIds((prev) => prev.filter((id) => id !== item.index));
        }}
        onSelectItems={handleSelect}
        canDragAndDrop={false}
        canDropOnFolder={false}
        canReorderItems={false}
        renderItemTitle={({ item, context }) => (
          <div
            className={`
            flex w-full items-center gap-2 rounded-md px-2 py-1.5 transition-all duration-150
            ${
              context.isSelected
                ? "bg-aurora-100 text-aurora-700 dark:bg-aurora-900/30 dark:text-aurora-300"
                : "hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800/50 dark:hover:text-neutral-300"
            }
            ${item.isFolder ? "font-medium text-neutral-700 dark:text-neutral-200" : "text-neutral-600 dark:text-neutral-400"}
          `}
          >
            {item.isFolder ? (
              <FolderIcon
                className={`h-4 w-4 ${context.isSelected ? "text-aurora-500" : "text-sunset-500"}`}
              />
            ) : (
              <DocumentIcon
                className={`h-4 w-4 ${context.isSelected ? "text-aurora-500" : "text-neutral-400 dark:text-neutral-500"}`}
              />
            )}
            <span className="truncate">{item.data.title}</span>
          </div>
        )}
        renderItemArrow={({ item, context }) =>
          item.isFolder ? (
            <ChevronRightIcon
              className={`h-3.5 w-3.5 text-neutral-500 transition-transform duration-150 dark:text-neutral-400
                ${context.isExpanded ? "rotate-90" : ""}`}
            />
          ) : null
        }
      >
        <div className="px-2 py-1">
          <Tree treeId="tree-1" rootItem="root" />
        </div>
      </UncontrolledTreeEnvironment>
    </div>
  );
}

export default FileMenu;
