import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type ContextItem } from "~/server/utils/codebaseContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faInfoCircle,
  faChevronLeft,
  faChevronRight,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";
import Mermaid from "./Mermaid";
import Markdown from "react-markdown";
import { renderers } from "../chat/ChatMessage";
import gfm from "remark-gfm";
import path from "path";
import CodeSection from "./CodeSection";
import ImportsSection from "./ImportsSection";
import ExportsSection from "./ExportsSection";

interface CodebaseDetailsProps {
  item: ContextItem;
  onClose: () => void;
  onToggleWidth: () => void;
  isExpanded?: boolean;
  allFiles: string[];
  onNodeClick: (path: string) => void;
}

const CodebaseDetails: React.FC<CodebaseDetailsProps> = ({
  item,
  onClose,
  onToggleWidth,
  isExpanded = false,
  allFiles,
  onNodeClick,
}) => (
  <div className="details h-full overflow-y-auto bg-gray-900 text-left text-sm text-white">
    <div className="sticky top-0 z-10 flex h-12 items-center justify-between bg-gradient-to-r from-gray-800 to-gray-700 px-4 shadow-md">
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleWidth}
          className="text-gray-400 transition-colors hover:text-white"
        >
          <FontAwesomeIcon
            icon={isExpanded ? faChevronRight : faChevronLeft}
            size="lg"
          />
        </button>
        <h2 className="truncate text-lg font-semibold">
          {path.basename(item.file)}
        </h2>
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={onClose}
          className="text-gray-400 transition-colors hover:text-white"
        >
          <FontAwesomeIcon icon={faTimes} size="lg" />
        </button>
      </div>
    </div>

    <div className="mt-4 space-y-6 px-4">
      <p className="mb-3 text-gray-300">{item.overview}</p>
      {item.diagram && <Mermaid chart={item.diagram} />}
      <Section icon={faInfoCircle} title="Overview" iconColor="text-blue-400">
        <Markdown
          remarkPlugins={[gfm]}
          className={`markdown-details`}
          components={renderers}
        >
          {item.text}
        </Markdown>
      </Section>

      <ImportsSection
        importStatements={item.importStatements}
        importedFiles={item.importedFiles}
        allFiles={allFiles}
        onFileClick={onNodeClick}
        referencedImportDetails={item.referencedImportDetails ?? []}
        currentFile={item.file}
      />

      {item.exports?.length ? <ExportsSection contextItem={item} /> : null}

      {item?.code?.length ? <CodeSection code={item.code} /> : null}
    </div>
  </div>
);

export const Section: React.FC<{
  icon: any;
  title: string;
  iconColor: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}> = ({ icon, title, iconColor, children, defaultExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mb-4"
    >
      <h3
        className="mb-2 flex cursor-pointer items-center justify-between text-base font-semibold"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <FontAwesomeIcon icon={icon} className={`mr-2 ${iconColor}`} />
          {title}
        </div>
        <FontAwesomeIcon
          icon={isExpanded ? faChevronDown : faChevronRight}
          className="text-gray-400"
        />
      </h3>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
};
export default CodebaseDetails;
