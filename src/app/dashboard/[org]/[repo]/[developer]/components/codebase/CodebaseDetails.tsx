// components/CodebaseDetails.tsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faCode,
  faFileImport,
  faFileExport,
  faProjectDiagram,
} from "@fortawesome/free-solid-svg-icons";
import { type ContextItem } from "~/server/utils/codebaseContext";
import Mermaid from "./Mermaid";
import CodePreview from "./CodePreview";

interface CodebaseDetailsProps {
  item: ContextItem;
  onClose: () => void;
}

const CodebaseDetails: React.FC<CodebaseDetailsProps> = ({ item, onClose }) => {
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", icon: faCode, label: "Overview" },
    { id: "imports", icon: faFileImport, label: "Imports" },
    { id: "exports", icon: faFileExport, label: "Exports" },
    { id: "diagram", icon: faProjectDiagram, label: "Diagram" },
    { id: "preview", icon: faCode, label: "Code Preview" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-blueGray-900 bg-opacity-75 backdrop-blur"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="max-h-[90vh] w-[90vw] overflow-hidden rounded-lg bg-blueGray-800 shadow-2xl"
      >
        <div className="flex items-center justify-between bg-blueGray-700 p-4">
          <h2 className="text-2xl font-bold text-gray-100">{item.file}</h2>
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="rounded-full bg-blueGray-600 p-2 text-gray-300 transition-colors hover:bg-blueGray-500 hover:text-light-blue"
          >
            <FontAwesomeIcon icon={faTimes} />
          </motion.button>
        </div>
        <div className="flex">
          <div className="w-1/4 bg-blueGray-700 p-4">
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`mb-2 flex w-full items-center rounded-lg p-2 text-left text-gray-300 transition-colors ${
                  activeTab === tab.id
                    ? "bg-light-blue text-white"
                    : "hover:bg-blueGray-600"
                }`}
              >
                <FontAwesomeIcon icon={tab.icon} className="mr-2" />
                {tab.label}
              </motion.button>
            ))}
          </div>
          <div className="w-3/4 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === "overview" && (
                  <div>
                    <h3 className="mb-4 text-xl font-semibold text-gray-200">
                      Overview
                    </h3>
                    <p className="text-gray-300">{item.overview}</p>
                  </div>
                )}
                {activeTab === "imports" && (
                  <div>
                    <h3 className="mb-4 text-xl font-semibold text-gray-200">
                      Imports
                    </h3>
                    <ul className="space-y-2">
                      {item.importStatements.map((imp, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="rounded-lg bg-blueGray-700 p-2 text-gray-300"
                        >
                          {imp}
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                )}
                {activeTab === "exports" && (
                  <div>
                    <h3 className="mb-4 text-xl font-semibold text-gray-200">
                      Exports
                    </h3>
                    <ul className="space-y-2">
                      {item.exports.map((exp, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="rounded-lg bg-blueGray-700 p-2 text-gray-300"
                        >
                          <span className="font-semibold">{exp.name}</span>
                          <span className="ml-2 text-sm text-gray-400">
                            ({exp.exportType})
                          </span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                )}
                {activeTab === "diagram" && (
                  <div>
                    <h3 className="mb-4 text-xl font-semibold text-gray-200">
                      Diagram
                    </h3>
                    <Mermaid chart={item.diagram} />
                  </div>
                )}
                {activeTab === "preview" && (
                  <div>
                    <h3 className="mb-4 text-xl font-semibold text-gray-200">
                      Code Preview
                    </h3>
                    <CodePreview code={item.code.join("\n")} />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CodebaseDetails;
