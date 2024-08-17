import React from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileExport,
  faChevronDown,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { Section } from "./CodebaseDetails";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { ContextItem } from "~/server/utils/codebaseContext";

export interface ExportsSectionProp {
  contextItem: ContextItem;
}

export const ExportsSection = ({ contextItem }: ExportsSectionProp) => {
  const exports = contextItem.exports;
  const [expandedItems, setExpandedItems] = React.useState<Set<number>>(
    new Set(),
  );

  const toggleItem = (index: number) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <Section icon={faFileExport} title="Exports" iconColor="text-purple-400">
      <div className="space-y-4">
        {exports.map((item, index) => {
          const isExpanded = expandedItems.has(index);
          const truncatedCode =
            item.code_referenced.length > 50
              ? item.code_referenced.slice(0, 50) + "..."
              : item.code_referenced;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="overflow-hidden rounded-lg bg-gray-800 shadow-lg"
            >
              <div
                className="flex cursor-pointer items-center justify-between bg-gray-700 px-4 py-2 text-sm font-medium"
                onClick={() => toggleItem(index)}
              >
                <div className="flex items-center space-x-2 overflow-hidden">
                  <span className="whitespace-nowrap text-blue-400">
                    {item.exportType}
                  </span>
                  <span className="whitespace-nowrap text-gray-300">
                    Line {item.line_no}
                  </span>
                  {!isExpanded && (
                    <span className="whitespace-nowrap text-gray-300/50">
                      {item.name}
                    </span>
                  )}
                  {!isExpanded && (
                    <span className="truncate pl-2 text-gray-300/50">
                      {truncatedCode}
                    </span>
                  )}
                </div>
                <FontAwesomeIcon
                  icon={isExpanded ? faChevronDown : faChevronRight}
                  className="ml-2 flex-shrink-0 text-gray-400"
                />
              </div>
              {isExpanded && (
                <div className="p-4">
                  <SyntaxHighlighter
                    language="typescript"
                    style={atomOneDark}
                    customStyle={{
                      background: "transparent",
                      padding: 0,
                      margin: 0,
                    }}
                  >
                    {item.code_referenced}
                  </SyntaxHighlighter>
                  {item.type && (
                    <div className="mt-2 text-sm text-gray-400">
                      <strong>Type:</strong> {item.type}
                    </div>
                  )}
                  {item.source && (
                    <div className="mt-1 text-sm text-gray-400">
                      <strong>Source:</strong> {item.source}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </Section>
  );
};

export default ExportsSection;
