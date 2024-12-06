import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleNotch,
  faSpinner,
  faCheckCircle,
  faTimesCircle,
} from "@fortawesome/free-solid-svg-icons";
import { motion } from "framer-motion";

interface StatusBarProps {
  researchStatus: "Not Started" | "In Progress" | "Ready";
  planStatus: "Not Started" | "Ready";
}

const StatusBar: React.FC<StatusBarProps> = ({
  researchStatus,
  planStatus,
}) => {
  const getResearchIcon = () => {
    switch (researchStatus) {
      case "Not Started":
        return faTimesCircle;
      case "In Progress":
        return faSpinner;
      case "Ready":
        return faCheckCircle;
      default:
        return faCircleNotch;
    }
  };

  const getPlanIcon = () => {
    switch (planStatus) {
      case "Not Started":
        return faTimesCircle;
      case "Ready":
        return faCheckCircle;
      default:
        return faCircleNotch;
    }
  };

  const getResearchColor = () => {
    switch (researchStatus) {
      case "Not Started":
        return "text-error-500 dark:text-error-300";
      case "In Progress":
        return "text-yellow-500 dark:text-yellow-300";
      case "Ready":
        return "text-green-500 dark:text-green-300";
      default:
        return "text-gray-500 dark:text-gray-300";
    }
  };

  const getPlanColor = () => {
    switch (planStatus) {
      case "Not Started":
        return "text-error-500 dark:text-error-300";
      case "Ready":
        return "text-green-500 dark:text-green-300";
      default:
        return "text-gray-500 dark:text-gray-300";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-6 flex w-full flex-col space-y-4 rounded-md bg-gray-100 p-4 dark:bg-gray-700 md:flex-row md:space-x-6 md:space-y-0"
      aria-label="Todo Status Bar"
    >
      {/* Research Status */}
      <div className="flex items-center space-x-2">
        <FontAwesomeIcon
          icon={getResearchIcon()}
          className={`h-5 w-5 ${getResearchColor()} animate-spin-${researchStatus === "In Progress" ? "slow" : ""}`}
          aria-hidden="true"
        />
        <span className={`text-sm font-medium ${getResearchColor()}`}>
          Research: {researchStatus}
        </span>
      </div>

      {/* Plan Status */}
      <div className="flex items-center space-x-2">
        <FontAwesomeIcon
          icon={getPlanIcon()}
          className={`h-5 w-5 ${getPlanColor()} ${planStatus === "Ready" ? "animate-pulse" : ""}`}
          aria-hidden="true"
        />
        <span className={`text-sm font-medium ${getPlanColor()}`}>
          Plan: {planStatus}
        </span>
      </div>
    </motion.div>
  );
};

export default StatusBar;
