// components/CodebaseNode.tsx
import React, { useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileImport,
  faFileExport,
  faInfoCircle,
} from "@fortawesome/free-solid-svg-icons";
import { type ContextItem } from "~/server/utils/codebaseContext";

const CodebaseNode: React.FC<NodeProps<any>> = ({ data }) => {
  const { item, label } = data as { item: ContextItem; label: string };
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      <motion.div
        className="from-pink-600 absolute -inset-0.5 rounded-lg bg-gradient-to-r to-purple-600 opacity-75 blur"
        animate={{
          opacity: isHovered ? 1 : 0.75,
          scale: isHovered ? 1.02 : 1,
        }}
        transition={{ duration: 0.3 }}
      />
      <motion.div
        className="relative rounded-lg bg-blueGray-800 px-6 py-4 shadow-xl"
        animate={{
          y: isHovered ? -5 : 0,
          boxShadow: isHovered
            ? "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
            : "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-pink-500"
        />
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-100">{label}</h3>
          <div className="flex space-x-2">
            <motion.span
              className="flex items-center text-sm text-gray-300"
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            >
              <FontAwesomeIcon
                icon={faFileImport}
                className="text-pink-500 mr-1"
              />
              {item.importStatements.length}
            </motion.span>
            <motion.span
              className="flex items-center text-sm text-gray-300"
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            >
              <FontAwesomeIcon
                icon={faFileExport}
                className="mr-1 text-purple-500"
              />
              {item.exports.length}
            </motion.span>
          </div>
        </div>
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-2 overflow-hidden"
            >
              <p className="text-sm text-gray-300">
                {item.overview.slice(0, 100)}...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        <Handle
          type="source"
          position={Position.Bottom}
          className="!bg-purple-500"
        />
      </motion.div>
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="absolute -right-2 -top-2"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <FontAwesomeIcon
              icon={faInfoCircle}
              className="text-2xl text-light-blue"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CodebaseNode;
