import { faChevronUp, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import MarkdownRenderer from "../../components/MarkdownRenderer";

export const Research: React.FC<{ item: any; isLastItem: boolean }> = ({
  item,
  isLastItem,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className={`mb-6 border-b border-sunset-200/50 pb-4 dark:border-gray-700/50 ${isLastItem ? "border-none" : ""}`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-left"
      >
        <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200">
          {item.question}
        </h4>
        <FontAwesomeIcon
          icon={isOpen ? faChevronUp : faChevronDown}
          className="ml-2 text-gray-500 transition-transform dark:text-gray-400"
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial="collapsed"
            animate="open"
            exit="collapsed"
            variants={{
              open: { opacity: 1, height: "auto", marginTop: 16 },
              collapsed: { opacity: 0, height: 0, marginTop: 0 },
            }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
          >
            <div className="markdown-chat ">
              <MarkdownRenderer>{item.answer}</MarkdownRenderer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Research;
