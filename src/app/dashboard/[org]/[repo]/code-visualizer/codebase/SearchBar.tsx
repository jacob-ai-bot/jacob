// components/SearchBar.tsx
import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { api } from "~/trpc/react";
import { type ContextItem } from "~/server/utils/codebaseContext";
import SearchResults from "./SearchResults";

interface SearchBarProps {
  codebaseContext: ContextItem[];

  onSelectResult: (filePath: string) => void;
  isDetailsExpanded?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  codebaseContext,
  onSelectResult,
  isDetailsExpanded = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<ContextItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const searchCodebase = api.codebaseContext.searchCodebase.useMutation();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      const results = await searchCodebase.mutateAsync({
        codebaseContext,
        query: searchTerm,
      });
      setIsLoading(false);
      if (results) {
        setSearchResults(results);
      }
    },
    [searchCodebase, codebaseContext, searchTerm],
  );

  const handleSelectResult = (filePath: string) => {
    onSelectResult(filePath);
    setSearchResults([]);
    setSearchTerm("");
    setIsExpanded(false);
  };

  const handleInputFocus = () => {
    setIsExpanded(true);
  };

  const handleInputBlur = () => {
    if (searchTerm === "" && searchResults.length === 0) {
      setIsExpanded(false);
    }
  };

  const handleCloseResults = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchResults([]);
    setSearchTerm("");
    setIsExpanded(false);
  }, []);

  return (
    <div
      className={`absolute  right-0 ${searchResults?.length ? "-top-6 rounded-t-md bg-white p-2 shadow-sm" : "-top-4"}`}
    >
      <form onSubmit={handleSubmit} className="flex items-center">
        <motion.input
          className="w-full rounded-l-lg border-0 bg-[#e9f8ff] px-4 py-1 text-black ring-0 focus:outline-none focus:ring-0"
          animate={{
            width: isExpanded
              ? isDetailsExpanded && !searchResults?.length
                ? "300px"
                : "500px"
              : "200px",
          }}
          transition={{ duration: 0.3 }}
          value={searchTerm}
          disabled={isLoading}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder="Search files..."
        />
        <motion.button
          disabled={isLoading}
          type="submit"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`rounded-r-lg px-4 py-1 text-white ${isLoading ? "bg-gray-500" : "bg-aurora-500/50"}`}
        >
          {isLoading ? (
            <FontAwesomeIcon icon={faSpinner} spin />
          ) : (
            <FontAwesomeIcon icon={faSearch} />
          )}
        </motion.button>
      </form>
      {searchResults.length > 0 && (
        <div className="absolute right-0 z-10 mt-1">
          <SearchResults
            results={searchResults}
            onSelect={handleSelectResult}
            onClose={(e) => handleCloseResults(e)}
          />
        </div>
      )}
    </div>
  );
};

export default SearchBar;
