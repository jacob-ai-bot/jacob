"use client";
import { type ContextItem } from "~/server/utils/codebaseContext";
import CodebaseVisualizer from "./codebase/CodebaseVisualizer";
import { useTheme } from "next-themes";

interface CodebaseParams {
  contextItems: ContextItem[];
}

const Codebase: React.FC<CodebaseParams> = ({ contextItems }) => {
  const { resolvedTheme } = useTheme();
  if (contextItems.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h2 className="mb-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Generating Codebase Context
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            We&apos;re analyzing your codebase in the background. Please check
            back in a few minutes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <CodebaseVisualizer
      contextItems={contextItems}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
    />
  );
};

export default Codebase;
