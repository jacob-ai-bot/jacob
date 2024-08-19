// components/Timeline.tsx
import React from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { type ContextItem } from "~/server/utils/codebaseContext";

interface TimelineProps {
  contextItems: ContextItem[];
  onClose: () => void;
}

const Timeline: React.FC<TimelineProps> = ({ contextItems, onClose }) => {
  // This is a placeholder implementation. You'd need to implement actual timeline logic here.
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="absolute bottom-0 left-0 right-0 bg-blueGray-800 bg-opacity-90 p-4 backdrop-blur"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-100">Timeline</h2>
        <motion.button
          onClick={onClose}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="text-gray-300 hover:text-light-blue"
        >
          <FontAwesomeIcon icon={faTimes} />
        </motion.button>
      </div>
      <div className="mt-4 flex space-x-4 overflow-x-auto">
        {contextItems.map((item, index) => (
          <motion.div
            key={item.file}
            className="flex-shrink-0 rounded-lg bg-blueGray-700 p-2 text-gray-300"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            {item.file}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default Timeline;
