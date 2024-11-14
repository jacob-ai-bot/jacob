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
  faListCheck,
  faComments,
} from "@fortawesome/free-solid-svg-icons";
import type { Evaluation as EvaluationType } from "~/server/utils/evaluateIssue";
import { BorderBeam } from "~/app/_components/magicui/border-beam";
import { AnimatedShinyText } from "~/app/_components/magicui/animated-shiny-text";

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

  const renderProgressBar = (value: number, max = 5) => {
    const percentage = (value / max) * 100;
    return (
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className="h-full rounded-full bg-aurora-500 transition-all duration-500 ease-out dark:bg-aurora-400"
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  };

  return (
    <div className="relative rounded-lg bg-white p-4 shadow-lg transition-all dark:bg-gray-800">
      <BorderBeam
        className="absolute inset-0 opacity-50"
        colorFrom="#00C8FF"
        colorTo="#FF3390"
      />
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
          <AnimatedShinyText className="text-sm font-medium">
            Confidence Score: {evaluation.confidenceScore}/5
          </AnimatedShinyText>
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
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2 rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
                <div className="flex items-center space-x-2">
                  <FontAwesomeIcon
                    icon={faCode}
                    className="text-aurora-500 dark:text-aurora-400"
                  />
                  <h4 className="font-semibold text-gray-700 dark:text-gray-300">
                    Complexity Factors
                  </h4>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>Code Complexity</span>
                      <span className="text-aurora-600 dark:text-aurora-400">
                        {evaluation.complexityFactors.codeComplexity}
                      </span>
                    </div>
                    {renderProgressBar(
                      parseInt(evaluation.complexityFactors.codeComplexity),
                    )}
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>Context Understanding</span>
                      <span className="text-aurora-600 dark:text-aurora-400">
                        {evaluation.complexityFactors.contextUnderstanding}
                      </span>
                    </div>
                    {renderProgressBar(
                      parseInt(
                        evaluation.complexityFactors.contextUnderstanding,
                      ),
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
                <div className="flex items-center space-x-2">
                  <FontAwesomeIcon
                    icon={faExclamationTriangle}
                    className="text-sunset-500 dark:text-sunset-400"
                  />
                  <h4 className="font-semibold text-gray-700 dark:text-gray-300">
                    Risk Areas
                  </h4>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  {evaluation.specificRiskAreas.map((risk, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="mt-1 block h-1.5 w-1.5 rounded-full bg-sunset-500" />
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2 rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
                <div className="flex items-center space-x-2">
                  <FontAwesomeIcon
                    icon={faClock}
                    className="text-meadow-500 dark:text-meadow-400"
                  />
                  <h4 className="font-semibold text-gray-700 dark:text-gray-300">
                    Estimated Effort
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-gray-800">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Story Points
                    </div>
                    <div className="text-xl font-bold text-meadow-500 dark:text-meadow-400">
                      {evaluation.estimatedEffort.storyPoints}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-gray-800">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Skill Level
                    </div>
                    <div className="text-xl font-bold text-meadow-500 dark:text-meadow-400">
                      {evaluation.estimatedEffort.requiredSkillLevel}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
                <div className="flex items-center space-x-2">
                  <FontAwesomeIcon
                    icon={faLightbulb}
                    className="text-blossom-500 dark:text-blossom-400"
                  />
                  <h4 className="font-semibold text-gray-700 dark:text-gray-300">
                    Recommendations
                  </h4>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  {evaluation.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="mt-1 block h-1.5 w-1.5 rounded-full bg-blossom-500" />
                      <span>{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="col-span-2 space-y-2 rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
                <div className="flex items-center space-x-2">
                  <FontAwesomeIcon
                    icon={faComments}
                    className="text-aurora-500 dark:text-aurora-400"
                  />
                  <h4 className="font-semibold text-gray-700 dark:text-gray-300">
                    Feedback
                  </h4>
                </div>
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
