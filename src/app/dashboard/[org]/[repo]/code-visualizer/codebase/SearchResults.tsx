import React from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { type ContextItem } from "~/server/utils/codebaseContext";

interface SearchResultsProps {
  results: ContextItem[];
  onSelect: (filePath: string) => void;
  onClose: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  onSelect,
  onClose,
}) => {
  return (
    <div className="my-1 w-full">
      {results.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="hide-scrollbar relative h-full overflow-hidden overflow-y-scroll rounded-b-md bg-white/90 shadow-sm backdrop-blur-sm dark:bg-gray-800"
        >
          <button
            onClick={onClose}
            className="absolute right-2 top-2 rounded-full bg-gray-200 px-2 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
          >
            <FontAwesomeIcon icon={faTimes} className="" />
          </button>
          <ul>
            {results.slice(0, 10).map((result, index) => (
              <motion.li
                key={index}
                className={`flex cursor-pointer flex-col p-3 pb-2 hover:bg-aurora-100/50 dark:hover:bg-gray-700
                    ${index === 0 ? "rounded-t-md pt-5" : ""}
                    ${index === results.length - 1 ? "rounded-b-md" : ""}
                    ${index % 2 === 0 ? "bg-aurora-50/30" : ""}`}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onSelect(result.file)}
              >
                <div className="file-path text-sm font-medium text-gray-800 dark:text-gray-200">
                  {result.file}
                </div>
                <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  {result.overview}
                </div>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      ) : (
        <div className="no-results rounded-md bg-white p-3 text-center text-gray-500 shadow-lg dark:bg-gray-800 dark:text-gray-400">
          No matching files found.
        </div>
      )}
    </div>
  );
};

export default SearchResults;
