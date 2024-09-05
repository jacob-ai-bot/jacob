import React from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCode,
  faChevronDown,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { Section } from "./CodebaseDetails";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";

export const CodeSection: React.FC<{ code: string[] }> = ({ code }) => {
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

  const parseCodeItem = (item: string) => {
    const match = item.match(/^\((.*?)\)\s*(\d+):\s*(.*)/s);
    if (match?.length === 4) {
      const [, type, lineNumber, code] = match;
      return {
        type,
        lineNumber: parseInt(lineNumber!, 10),
        code: code!.trim() ?? "",
      };
    }
    return { type: "Unknown", lineNumber: null, code: item ?? "" };
  };
  return (
    <Section icon={faCode} title="Tree Sitter Code" iconColor="text-green-400">
      <div className="space-y-4">
        {code.map((item, index) => {
          const { type, lineNumber, code } = parseCodeItem(item);
          const isExpanded = expandedItems.has(index);
          const truncatedCode =
            code.length > 50 ? code.slice(0, 50) + "..." : code;

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
                    {type}
                  </span>
                  {lineNumber && (
                    <span className="whitespace-nowrap text-gray-300">
                      Line {lineNumber}
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
                    {code}
                  </SyntaxHighlighter>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </Section>
  );
};

export default CodeSection;
