import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faChevronUp,
  faCode,
  faLightbulb,
  faExclamationTriangle,
  faClock,
  faComments,
} from "@fortawesome/free-solid-svg-icons";
import type { Evaluation as EvaluationType } from "~/server/utils/evaluateIssue";

interface EvaluationProps {
  evaluation: EvaluationType;
}

const Evaluation: React.FC<EvaluationProps> = ({ evaluation }) => {
  const [isOpen, setIsOpen] = useState(false);

  const getIndicatorColor = (indicator: "Red" | "Yellow" | "Green") => {
    switch (indicator) {
      case "Red":
        return "bg-error-400";
      case "Yellow":
        return "bg-sunset-400";
      case "Green":
        return "bg-meadow-800/80";
      default:
        return "bg-neutral-400";
    }
  };

  const getTagColor = (index: number) => {
    switch (index % 4) {
      case 0:
        return "bg-meadow-100 text-meadow-800 dark:bg-meadow-900/30 dark:text-meadow-300";
      case 1:
        return "bg-aurora-100 text-aurora-800 dark:bg-aurora-900/30 dark:text-aurora-300";
      case 2:
        return "bg-sunset-100 text-sunset-800 dark:bg-sunset-900/30 dark:text-sunset-300";
      case 3:
        return "bg-blossom-100 text-blossom-800 dark:bg-blossom-900/30 dark:text-blossom-300";
      default:
        return "bg-meadow-100 text-meadow-800 dark:bg-meadow-900/30 dark:text-meadow-300";
    }
  };

  const renderProgressBar = (
    value: "Low" | "Medium" | "High",
    label: string,
    isInverse = false,
  ) => {
    const numericValue = value === "Low" ? 1 : value === "Medium" ? 3 : 5;
    const percentage = (numericValue / 5) * 100;
    const getBarColor = () => {
      if (numericValue <= 2)
        return isInverse ? "bg-error-400" : "bg-meadow-800/80";
      if (numericValue <= 4) return "bg-sunset-400";
      return isInverse ? "bg-meadow-800/80" : "bg-error-400";
    };

    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-600 dark:text-neutral-300">
            {label}
          </span>
          <span className="font-medium text-aurora-600 dark:text-aurora-400">
            {value}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={`h-full rounded-full ${getBarColor()}`}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="overflow-hidden ">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-2 transition "
      >
        <div className="flex flex-shrink flex-col">
          <div className="flex flex-row items-center gap-3">
            <div
              className={`h-3 w-3 rounded-full ${getIndicatorColor(
                evaluation.overallIndicator,
              )}`}
            />
            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
              AI Coding Assessment Report
            </h3>
          </div>
          <p className="text-left text-sm text-slate-900/60 dark:text-slate-300/50">
            A detailed analysis of the task complexity and the estimated
            likelihood of success.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="whitespace-nowrap text-sm font-medium text-neutral-500 dark:text-neutral-400">
            Confidence Score: {evaluation.confidenceScore}/5
          </span>
          <FontAwesomeIcon
            icon={isOpen ? faChevronUp : faChevronDown}
            className="text-neutral-400 transition-transform dark:text-neutral-500"
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-neutral-100 dark:border-neutral-800"
          >
            <div className="grid gap-4 py-4 md:grid-cols-2">
              {/* Complexity Factors */}
              <div className="space-y-4 rounded-lg border border-neutral-100 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
                  <FontAwesomeIcon
                    icon={faCode}
                    className="text-aurora-500 dark:text-aurora-400"
                  />
                  <h4 className="font-medium">Complexity Factors</h4>
                </div>
                {renderProgressBar(
                  evaluation.complexityFactors.codeComplexity,
                  "Code Complexity",
                )}
                {renderProgressBar(
                  evaluation.complexityFactors.contextUnderstanding,
                  "Issue Scope and Clarity",
                  true,
                )}
              </div>

              {/* Risk Areas */}
              <div className="space-y-4 rounded-lg border border-neutral-100 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
                  <FontAwesomeIcon
                    icon={faExclamationTriangle}
                    className="text-sunset-500 dark:text-sunset-400"
                  />
                  <h4 className="font-medium">Risk Areas</h4>
                </div>
                <ul className="space-y-2">
                  {evaluation.specificRiskAreas.map((risk, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="mt-2 block h-1.5 w-1.5 rounded-full bg-sunset-400" />
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        {risk}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Estimated Effort */}
              <div className="space-y-4 rounded-lg border border-neutral-100 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
                  <FontAwesomeIcon
                    icon={faClock}
                    className="text-meadow-800/80 dark:text-meadow-800/80"
                  />
                  <h4 className="font-medium">Estimated Effort</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800">
                    <div className="text-sm text-neutral-500 dark:text-neutral-400">
                      Story Points
                    </div>
                    <div className="text-xl font-bold text-meadow-800/80 dark:text-meadow-800/80">
                      {evaluation.estimatedEffort.storyPoints}
                    </div>
                  </div>
                  <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800">
                    <div className="text-sm text-neutral-500 dark:text-neutral-400">
                      Skill Level
                    </div>
                    <div className="text-xl font-bold text-meadow-800/80 dark:text-meadow-800/80">
                      {evaluation.estimatedEffort.requiredSkillLevel}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="mb-2 text-sm text-neutral-500 dark:text-neutral-400">
                    Required Skills
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {evaluation.estimatedEffort.skillset.map((skill, index) => (
                      <span
                        key={index}
                        className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${getTagColor(index)}`}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="space-y-4 rounded-lg border border-neutral-100 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
                  <FontAwesomeIcon
                    icon={faLightbulb}
                    className="text-blossom-500 dark:text-blossom-400"
                  />
                  <h4 className="font-medium">Recommendations</h4>
                </div>
                <ul className="space-y-2">
                  {evaluation.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="mt-2 block h-1.5 w-1.5 rounded-full bg-blossom-400" />
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        {recommendation}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Feedback */}
              <div className="col-span-2 space-y-4 rounded-lg border border-neutral-100 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
                  <FontAwesomeIcon
                    icon={faComments}
                    className="text-aurora-500 dark:text-aurora-400"
                  />
                  <h4 className="font-medium">Feedback</h4>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {evaluation.feedback}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Evaluation;
