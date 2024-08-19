"use client";
import { type ContextItem } from "~/server/utils/codebaseContext";
import CodebaseVisualizer from "../dashboard/[org]/[repo]/[developer]/components/codebase/CodebaseVisualizer";

interface CodebaseParams {
  contextItems: ContextItem[];
}

const Codebase: React.FC<CodebaseParams> = ({ contextItems }) => {
  return <CodebaseVisualizer contextItems={contextItems} />;
};

export default Codebase;
