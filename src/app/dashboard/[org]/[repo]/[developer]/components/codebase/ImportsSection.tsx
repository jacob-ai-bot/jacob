import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faExternalLinkAlt,
  faChevronDown,
  faChevronRight,
  faFileImport,
  faInfoCircle,
} from "@fortawesome/free-solid-svg-icons";
import { Section } from "./CodebaseDetails";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import Markdown from "react-markdown";

interface ImportsSectionProps {
  importStatements: string[];
  importedFiles: string[];
  allFiles: string[];
  onFileClick: (path: string) => void;
  referencedImportDetails: Array<{
    name: string;
    exportType: string;
    line_no: number;
    code_referenced: string;
    source?: string;
    overview?: string;
  }>;
  currentFile?: string;
}

const ImportsSection: React.FC<ImportsSectionProps> = ({
  importStatements,
  importedFiles,
  allFiles,
  onFileClick,
  referencedImportDetails,
  currentFile = "",
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

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

  const parseImport = (importStatement: string) => {
    const match = importStatement.match(/from ['"](.+)['"]/);
    return match ? match[1] : importStatement;
  };

  const isInternalImport = (importPath: string) =>
    allFiles.some((file) => file.endsWith(importPath));

  const categorizedImports = useMemo(() => {
    const imports = [
      ...importStatements,
      ...importedFiles.filter((file) => file !== currentFile),
    ];
    return imports.reduce(
      (acc, imp) => {
        const parsedImport = parseImport(imp);
        const category =
          isInternalImport(parsedImport) && parsedImport !== currentFile
            ? "internal"
            : "external";
        acc[category].push(imp);
        return acc;
      },
      { internal: [] as string[], external: [] as string[] },
    );
  }, [importStatements, importedFiles, allFiles, currentFile]);

  const renderInternalImport = (
    imp: string,
    details: (typeof referencedImportDetails)[0],
    index: number,
  ) => {
    const isExpanded = expandedItems.has(index);
    const fileName = imp.split("/").pop() || imp;
    const previewCode =
      `${details?.code_referenced?.slice(0, 50).trim()}...` || "";

    return (
      <motion.div
        key={`${imp}-${index}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="mb-4 overflow-hidden rounded-lg bg-gray-800 shadow-lg"
      >
        <div
          className="flex cursor-pointer items-center justify-between bg-gray-700 px-4 py-2 text-sm font-medium"
          onClick={() => toggleItem(index)}
        >
          <div className="flex flex-col overflow-hidden">
            <div className="flex items-center space-x-2">
              {/* <span className="whitespace-nowrap text-blue-400">
                {details.exportType}
              </span> */}
              <span
                className="cursor-pointer truncate text-blue-300 hover:text-blue-500"
                onClick={(e) => {
                  e.stopPropagation();
                  onFileClick(imp.replace(/^\//, ""));
                }}
              >
                {fileName}
              </span>
              <span className="whitespace-nowrap text-gray-300">
                {details.line_no}:
              </span>
              <span className="truncate text-gray-400">{previewCode}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFileClick(imp.replace(/^\//, ""));
              }}
              className="text-blue-400 hover:text-blue-300"
            >
              <FontAwesomeIcon icon={faExternalLinkAlt} />
            </button>
            <FontAwesomeIcon
              icon={isExpanded ? faChevronDown : faChevronRight}
              className="text-gray-400"
            />
          </div>
        </div>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="p-4">
                <SyntaxHighlighter
                  language="typescript"
                  style={atomOneDark}
                  customStyle={{
                    background: "transparent",
                    padding: "0.5rem",
                    fontSize: "0.8rem",
                  }}
                >
                  {details.code_referenced}
                </SyntaxHighlighter>
                {details.overview && (
                  <div className="mt-4">
                    <h5 className="mb-2 flex items-center text-sm font-semibold text-gray-300">
                      <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
                      Overview
                    </h5>
                    <Markdown className="text-sm text-gray-400">
                      {details.overview}
                    </Markdown>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const renderExternalImport = (imp: string, index: number) => {
    const isExpanded = true;

    return (
      <motion.div
        key={imp}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="rounded-lg bg-gray-800 shadow-lg"
      >
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="whitespace-normal p-4">
                <SyntaxHighlighter
                  language="typescript"
                  style={atomOneDark}
                  customStyle={{
                    background: "transparent",
                    padding: 0,
                    margin: 0,
                    whiteSpace: "normal",
                  }}
                >
                  {imp}
                </SyntaxHighlighter>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <Section icon={faFileImport} title="Imports" iconColor="text-yellow-400">
      <div className="space-y-6">
        {categorizedImports.internal.length > 0 && (
          <div>
            {categorizedImports.internal.map((imp, index) => {
              const details = referencedImportDetails.find(
                (d) => d.source === imp,
              );
              return details ? renderInternalImport(imp, details, index) : null;
            })}
          </div>
        )}
        {categorizedImports.external.length > 0 && (
          <div>
            <div className="space-y-2">
              {categorizedImports.external.map((imp, index) =>
                renderExternalImport(imp, index),
              )}
            </div>
          </div>
        )}
      </div>
    </Section>
  );
};

export default React.memo(ImportsSection);
