import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";
import type { Evaluation as EvaluationType } from "~/server/utils/evaluateIssue";

interface EvaluationProps {
  evaluation: EvaluationType;
}

const Evaluation: React.FC<EvaluationProps> = ({ evaluation }) => {
  const [isOpen, setIsOpen] = useState(false);

  const getIndicatorColor = (indicator: "Red" | "Yellow" | "Green") => {
    switch (indicator) {
      case "Red":
        return "bg-error-500";
      case "Yellow":
        return "bg-sunset-500";
      case "Green":
        return "bg-meadow-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="rounded-lg bg-white p-4 shadow-md dark:bg-gray-800">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center space-x-4">
          <div
            className={`h-4 w-4 rounded-full ${getIndicatorColor(
              evaluation.overallIndicator,
            )}`}
          />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Evaluation Summary
          </h3>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Confidence Score: {evaluation.confidenceScore}/5
          </span>
          <FontAwesomeIcon
            icon={isOpen ? faChevronUp : faChevronDown}
            className="text-gray-500 transition-transform dark:text-gray-400"
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial="collapsed"
            animate="open"
            exit="collapsed"
            variants={{
              open: { opacity: 1, height: "auto", marginTop: 16 },
              collapsed: { opacity: 0, height: 0, marginTop: 0 },
            }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
          >
            <div className="space-y-4">
              <div>
                <h4 className="mb-2 font-semibold text-gray-700 dark:text-gray-300">
                  Complexity Factors
                </h4>
                <ul className="list-inside list-disc space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <li>
                    Code Complexity:{" "}
                    {evaluation.complexityFactors.codeComplexity}
                  </li>
                  <li>
                    Context Understanding:{" "}
                    {evaluation.complexityFactors.contextUnderstanding}
                  </li>
                  <li>
                    Risk Factors: {evaluation.complexityFactors.riskFactors}
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="mb-2 font-semibold text-gray-700 dark:text-gray-300">
                  Specific Risk Areas
                </h4>
                <ul className="list-inside list-disc space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  {evaluation.specificRiskAreas.map((risk, index) => (
                    <li key={index}>{risk}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="mb-2 font-semibold text-gray-700 dark:text-gray-300">
                  Estimated Effort
                </h4>
                <ul className="list-inside list-disc space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <li>
                    Story Points: {evaluation.estimatedEffort.storyPoints}
                  </li>
                  <li>Time: {evaluation.estimatedEffort.time}</li>
                  <li>
                    Required Skill Level:{" "}
                    {evaluation.estimatedEffort.requiredSkillLevel}
                  </li>
                  <li>
                    Skillset: {evaluation.estimatedEffort.skillset.join(", ")}
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="mb-2 font-semibold text-gray-700 dark:text-gray-300">
                  Recommendations
                </h4>
                <ul className="list-inside list-disc space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  {evaluation.recommendations.map((recommendation, index) => (
                    <li key={index}>{recommendation}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="mb-2 font-semibold text-gray-700 dark:text-gray-300">
                  Feedback
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
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
