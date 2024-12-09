[Previous content remains unchanged until line 426]

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
    importance: 0,
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
            "size",
          ),
          value: getCircleSize(
            item.text ?? "",
            calculateImportance(item),
            "importance",
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
          "size",
        );
        child.value = getCircleSize(
          item.text ?? "",
          calculateImportance(item),
          "importance",
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

