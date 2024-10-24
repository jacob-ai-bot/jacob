import React from "react";
import {
  ArrowPathIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ForwardIcon,
  RefreshIcon,
} from "@heroicons/react/24/outline";

interface StepNavigationProps {
  onRestart: () => void;
  onStepBackward: () => void;
  onStepForward: () => void;
  onJumpToEnd: () => void;
  currentIndex: number;
  totalSteps: number;
  liveUpdatesEnabled: boolean;
  onToggleLiveUpdates: () => void;
  onRefresh: () => void;
}

const StepNavigation: React.FC<StepNavigationProps> = ({
  onRestart,
  onStepBackward,
  onStepForward,
  onJumpToEnd,
  currentIndex,
  totalSteps,
  liveUpdatesEnabled,
  onToggleLiveUpdates,
  onRefresh,
}) => {
  return (
    <div className="flex items-center justify-between bg-white px-4 py-2 dark:bg-gray-800">
      <div className="flex items-center">
        <label className="mr-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Live Updates
        </label>
        <button
          onClick={onToggleLiveUpdates}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-aurora-500 focus:ring-offset-2 ${
            liveUpdatesEnabled ? "bg-aurora-500" : "bg-gray-200"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              liveUpdatesEnabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
      {!liveUpdatesEnabled && (
        <>
          <button
            onClick={onRestart}
            disabled={currentIndex === 0}
            className="rounded p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
            title="Restart"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
          <button
            onClick={onStepBackward}
            disabled={currentIndex === 0}
            className="rounded p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
            title="Step Backward"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {`${currentIndex + 1} / ${totalSteps}`}
          </span>
          <button
            onClick={onStepForward}
            disabled={currentIndex === totalSteps - 1}
            className="rounded p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
            title="Step Forward"
          >
            <ArrowRightIcon className="h-5 w-5" />
          </button>
          <button
            onClick={onJumpToEnd}
            disabled={currentIndex === totalSteps - 1}
            className="rounded p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
            title="Jump to End"
          >
            <ForwardIcon className="h-5 w-5" />
          </button>
          <button
            onClick={onRefresh}
            className="rounded p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            title="Refresh"
          >
            <RefreshIcon className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
};

export default StepNavigation;