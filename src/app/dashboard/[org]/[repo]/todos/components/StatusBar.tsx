import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleNotch,
  faSpinner,
  faCheckCircle,
  faChartLine,
} from "@fortawesome/free-solid-svg-icons";
import { motion } from "framer-motion";
import type { Evaluation } from "~/server/utils/evaluateIssue";

interface StatusBarProps {
  researchStatus: "Not Started" | "In Progress" | "Ready";
  planStatus: "Not Started" | "In Progress" | "Ready";
  evaluationStatus: "Not Started" | "Ready";
  evaluation?: Evaluation | null;
}

const StatusBar: React.FC<StatusBarProps> = ({
  researchStatus,
  planStatus,
  evaluationStatus,
  evaluation,
}) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "Not Started":
        return {
          borderColor: "border-neutral-300 dark:border-neutral-700",
          iconColor: "text-neutral-600 dark:text-neutral-300",
          textColor: "text-neutral-800 dark:text-neutral-100",
          icon: faCircleNotch,
          spin: false,
        };
      case "In Progress":
        return {
          borderColor: "border-aurora-300 dark:border-aurora-700",
          iconColor: "text-aurora-600 dark:text-aurora-300",
          textColor: "text-neutral-800 dark:text-neutral-100",
          icon: faSpinner,
          spin: true,
        };
      case "Ready":
        return {
          borderColor: "border-meadow-300 dark:border-meadow-700",
          iconColor: "text-meadow-600 dark:text-meadow-300",
          textColor: "text-neutral-800 dark:text-neutral-100",
          icon: faCheckCircle,
          spin: false,
        };
      default:
        return {
          borderColor: "border-neutral-300 dark:border-neutral-700",
          iconColor: "text-neutral-600 dark:text-neutral-300",
          textColor: "text-neutral-800 dark:text-neutral-100",
          icon: faCircleNotch,
          spin: false,
        };
    }
  };

  const getEvaluationConfig = (indicator?: string) => {
    switch (indicator) {
      case "Red":
        return {
          borderColor: "border-error-300 dark:border-error-700",
          iconColor: "text-error-600 dark:text-error-300",
          textColor: "text-neutral-800 dark:text-neutral-100",
        };
      case "Yellow":
        return {
          borderColor: "border-sunset-300 dark:border-sunset-700",
          iconColor: "text-sunset-600 dark:text-sunset-300",
          textColor: "text-neutral-800 dark:text-neutral-100",
        };
      case "Green":
        return {
          borderColor: "border-meadow-300 dark:border-meadow-700",
          iconColor: "text-meadow-600 dark:text-meadow-300",
          textColor: "text-neutral-800 dark:text-neutral-100",
        };
      default:
        return {
          borderColor: "border-neutral-300 dark:border-neutral-700",
          iconColor: "text-neutral-600 dark:text-neutral-300",
          textColor: "text-neutral-800 dark:text-neutral-100",
        };
    }
  };

  const StatusCard = ({
    title,
    status,
  }: {
    title: string;
    status: "Not Started" | "In Progress" | "Ready";
  }) => {
    const { borderColor, iconColor, textColor, icon, spin } =
      getStatusConfig(status);
    return (
      <motion.div
        className={`relative w-48 rounded-md border-l-4 ${borderColor} bg-neutral-50 p-2 shadow-md transition-all dark:bg-neutral-700/50 dark:shadow-none`}
        whileHover={{ scale: 1.01 }}
      >
        <div className="flex items-center">
          <FontAwesomeIcon
            icon={icon}
            className={`${iconColor} ${spin ? "animate-spin-slow" : ""} h-4 w-4`}
          />
          <div className="ml-2">
            <p className={`text-sm font-medium ${textColor}`}>{title}</p>
            <p className={`text-xs ${textColor} opacity-80`}>{status}</p>
          </div>
        </div>
      </motion.div>
    );
  };

  const EvaluationCard = ({
    evaluation,
  }: {
    evaluation?: Evaluation | null;
  }) => {
    const { borderColor, iconColor, textColor } = getEvaluationConfig(
      evaluation?.overallIndicator,
    );
    return (
      <motion.div
        className={`relative w-48 rounded-md border-l-4 ${borderColor} bg-neutral-50 p-2 shadow-md transition-all dark:bg-neutral-700/50 dark:shadow-none`}
        whileHover={{ scale: 1.01 }}
      >
        <div className="flex items-center">
          <FontAwesomeIcon
            icon={faChartLine}
            className={`${iconColor} h-4 w-4`}
          />
          <div className="ml-2">
            <p className={`text-sm font-medium ${textColor}`}>Evaluation</p>
            <p className={`text-xs font-bold ${textColor} opacity-80`}>
              {evaluation
                ? `${evaluation.confidenceScore}/5 Confidence`
                : "Not Started"}
            </p>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-4 sm:flex-row"
    >
      <StatusCard title="Research" status={researchStatus} />
      <StatusCard title="Plan" status={planStatus} />
      <EvaluationCard evaluation={evaluation} />
    </motion.div>
  );
};

export default StatusBar;
