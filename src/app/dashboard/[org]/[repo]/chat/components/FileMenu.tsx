import { useEffect, useState } from "react";
import FolderTree from "react-folder-tree";
import "react-folder-tree/dist/style.css";
import { ContextItemSchema } from "@/data/codebaseContext";
import { z } from "zod";

type FileMenuProps = {
  codebaseContext: z.infer<typeof ContextItemSchema>[];
  onFileSelect: (filePath: string) => void;
  selectedFile?: string;
};

type TreeNode = {
  name: string;
  isFolder?: boolean;
  children?: TreeNode[];
  path?: string;
};

export const FileMenu = ({
  codebaseContext,
  onFileSelect,
  selectedFile,
}: FileMenuProps) => {
  const [treeData, setTreeData] = useState<TreeNode>({ name: "root", isFolder: true, children: [] });

  useEffect(() => {
    const buildTreeData = () => {
      const root: TreeNode = { name: "root", isFolder: true, children: [] };
      
      codebaseContext.forEach((item) => {
        const pathParts = item.file.split("/").filter(Boolean);
        let currentNode = root;

        pathParts.forEach((part, index) => {
          const isLastPart = index === pathParts.length - 1;
          const existingNode = currentNode.children?.find(
            (child) => child.name === part
          );

          if (existingNode) {
            currentNode = existingNode;
          } else {
            const newNode: TreeNode = {
              name: part,
              isFolder: !isLastPart,
              path: isLastPart ? item.file : undefined,
              children: !isLastPart ? [] : undefined,
            };
            currentNode.children = currentNode.children || [];
            currentNode.children.push(newNode);
            currentNode = newNode;
          }
        });
      });

      setTreeData(root);
    };

    buildTreeData();
  }, [codebaseContext]);

  const handleNodeClick = (state: any, event: any) => {
    if (!state.isFolder && state.path) {
      onFileSelect(state.path);
    }
  };

  const customStyles = {
    height: "calc(100vh - 200px)",
    overflow: "auto",
    padding: "1rem",
    backgroundColor: "var(--neutral-50)",
    borderRadius: "0.5rem",
    border: "1px solid var(--neutral-200)",
  };

  return (
    <div style={customStyles}>
      <FolderTree
        data={treeData}
        onChange={handleNodeClick}
        showCheckbox={false}
        initOpenStatus="open"
      />
    </div>
  );
};

export default FileMenu;

