import React from "react";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClipboardListIcon,
} from "@heroicons/react/solid";

interface StatusBarProps {
  researchCreated: boolean;
  totalPlanSteps: number;
  completedPlanSteps: number;
}

const StatusBar: React.FC<StatusBarProps> = ({
  researchCreated,
  totalPlanSteps,
  completedPlanSteps,
}) => {
  const getResearchStatus = () => {
    return researchCreated ? (
      <div className="flex items-center space-x-2">
        <CheckCircleIcon
          className="h-5 w-5 text-meadow-600 dark:text-meadow-400"
          aria-hidden="true"
        />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Research Created
        </span>
      </div>
    ) : (
      <div className="flex items-center space-x-2">
        <ExclamationCircleIcon
          className="h-5 w-5 text-error-600 dark:text-error-400"
          aria-hidden="true"
        />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Research Not Created
        </span>
      </div>
    );
  };

  const getPlanStatus = () => {
    return (
      <div className="flex items-center space-x-2">
        <ClipboardListIcon
          className="h-5 w-5 text-aurora-600 dark:text-aurora-400"
          aria-hidden="true"
        />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Plan Steps: {completedPlanSteps}/{totalPlanSteps}
        </span>
      </div>
    );
  };

  return (
    <div className="mb-6 flex flex-col items-start justify-between gap-4 overflow-hidden rounded-lg bg-white/80 p-4 shadow dark:bg-gray-800 md:flex-row md:items-center">
      {getResearchStatus()}
      {getPlanStatus()}
    </div>
  );
};

export default StatusBar;
