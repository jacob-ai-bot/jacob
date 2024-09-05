// components/SearchBar.tsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";

interface SearchBarProps {
  onSearch: (term: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchTerm);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center">
      <motion.input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search files..."
        className="rounded-l-lg bg-blueGray-700 px-4 py-2 text-gray-300 focus:outline-none focus:ring-2 focus:ring-light-blue"
        whileFocus={{ scale: 1.05 }}
      />
      <motion.button
        type="submit"
        className="rounded-r-lg bg-light-blue px-4 py-2 text-white"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <FontAwesomeIcon icon={faSearch} />
      </motion.button>
    </form>
  );
};

export default SearchBar;
