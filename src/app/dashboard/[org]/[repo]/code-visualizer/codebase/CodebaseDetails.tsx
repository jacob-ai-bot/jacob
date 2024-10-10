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
  faCopy,
  faCheck,
  faComments,
} from "@fortawesome/free-solid-svg-icons";
import Mermaid from "./Mermaid";
import Markdown from "react-markdown";
import gfm from "remark-gfm";
import path from "path";
import CodeSection from "./CodeSection";
import ImportsSection from "./ImportsSection";
import ExportsSection from "./ExportsSection";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/cjs/styles/prism";
import { faClipboard } from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import ChatModal from "../../chat/components/ChatModal";

interface CodebaseDetailsProps {
  item: ContextItem;
  onClose: () => void;
  onToggleWidth: () => void;
  isExpanded?: boolean;
  allFiles: string[];
  onNodeClick: (path: string) => void;
  viewMode: "folder" | "taxonomy";
  theme: "light" | "dark";
}

const copyToClipboard = async (text: string) => {
  await navigator.clipboard.writeText(text);
  toast.success("Copied to clipboard");
};

export const renderers: Partial<
  React.ComponentProps<typeof Markdown>["components"]
> = {
  code: ({
    inline,
    className,
    children,
    ...props
  }: React.ComponentPropsWithoutRef<"code"> & {
    inline: boolean;
    className: string;
  }) => {
    const match = /language-(\w+)/.exec(className || "");
    const theme = (props as { theme?: "light" | "dark" }).theme || "light";
    if (!inline && match) {
      return (
        <div className="relative">
          <button
            className="absolute right-2 top-0 rounded bg-gray-800 p-1 text-white"
            onClick={() => copyToClipboard(String(children))}
          >
            <FontAwesomeIcon icon={faClipboard} />
          </button>
          <SyntaxHighlighter
            style={theme === "dark" ? oneDark : oneLight}
            language={match[1]}
            PreTag="div"
            {...props}
          >
            {String(children).replace(/\n$/, "")}
          </SyntaxHighlighter>
        </div>
      );
    } else if (inline) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    } else {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
  },
};

const CodebaseDetails: React.FC<CodebaseDetailsProps> = ({
  item,
  onClose,
  onToggleWidth,
  isExpanded = false,
  allFiles,
  onNodeClick,
  viewMode,
  theme,
}) => {
  const [copyStatus, setCopyStatus] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleCopy = () => {
    navigator.clipboard
      .writeText(JSON.stringify(item, null, 2))
      .then(() => {
        setCopyStatus(true);
        setTimeout(() => setCopyStatus(false), 2000);
      })
      .catch(() => {
        console.error("Failed to copy context item");
      });
  };

  return (
    <div className="details hide-scrollbar h-full overflow-scroll bg-white text-left text-sm text-gray-800 dark:bg-gray-900 dark:text-white">
      <div className="sticky top-0 z-10 flex h-12 items-center justify-between bg-gradient-to-r from-aurora-50 to-aurora-100/70 px-4 shadow-sm dark:from-gray-800 dark:to-gray-700">
        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleWidth}
            className="text-aurora-500 transition-colors hover:text-aurora-600 dark:text-gray-400 dark:hover:text-white"
          >
            <FontAwesomeIcon
              icon={isExpanded ? faChevronRight : faChevronLeft}
              size="lg"
            />
          </button>
          <h2 className="truncate text-lg font-semibold text-gray-800 dark:text-blueGray-200">
            {path.basename(item.file)}
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsChatOpen(true)}
            className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-white"
          >
            <FontAwesomeIcon icon={faComments} size="lg" />
          </button>
          <button
            onClick={handleCopy}
            className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-white"
          >
            <FontAwesomeIcon icon={copyStatus ? faCheck : faCopy} size="lg" />
          </button>
          <button
            onClick={onClose}
            className=" text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-white"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-6 px-4">
        <p className="mb-3 text-gray-700 dark:text-gray-100">{item.overview}</p>
        {item.diagram && <Mermaid chart={item.diagram} theme={theme} />}
        <Section
          icon={faInfoCircle}
          title="Overview"
          iconColor="text-primary-500"
        >
          <Markdown
            remarkPlugins={[gfm]}
            className={`markdown-details text-gray-700 dark:text-neutral-200`}
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
          viewMode={viewMode}
          theme={theme}
        />

        {item.exports?.length ? (
          <ExportsSection contextItem={item} theme={theme} />
        ) : null}

        {item?.code?.length ? (
          <CodeSection code={item.code} theme={theme} />
        ) : null}
      </div>

      {isChatOpen && (
        <ChatModal
          file={item}
          onClose={() => setIsChatOpen(false)}
          org=""
          repo=""
        />
      )}
    </div>
  );
};

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
      className="mb-4 whitespace-pre-wrap"
    >
      <h3
        className="mb-2 flex cursor-pointer items-center justify-between text-base font-semibold text-gray-800 dark:text-gray-200"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <FontAwesomeIcon icon={icon} className={`mr-2 ${iconColor}`} />
          {title}
        </div>
        <FontAwesomeIcon
          icon={isExpanded ? faChevronDown : faChevronRight}
          className="text-gray-500 dark:text-gray-400"
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
