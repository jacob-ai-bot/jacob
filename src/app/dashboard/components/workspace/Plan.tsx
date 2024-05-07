import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faCircle,
  faCircleDot,
} from "@fortawesome/free-solid-svg-icons";
import { type Plan } from "~/types";

type ComponentProps = {
  planSteps: Plan[];
  currentPlanStep: number;
};

export const PlanComponent: React.FC<ComponentProps> = ({
  planSteps,
  currentPlanStep,
}) => (
  <div className="bg-blueGray-900 w-full p-2 pt-0 text-gray-100">
    <h2 className="border-blueGray-700 border-b py-2 text-lg font-semibold">
      Plan
    </h2>
    <div className="grid w-full grid-cols-1 gap-4 p-2 md:grid-cols-2 lg:grid-cols-3">
      {planSteps.map((plan, idx) => {
        const isCurrentStep = !plan.isComplete && idx === currentPlanStep;
        return (
          <div
            key={plan.id}
            className={`relative max-w-sm transform rounded-lg p-4 shadow-lg transition-all duration-300 ease-in-out hover:scale-105 ${
              idx === currentPlanStep
                ? "bg-blueGray-700 ring-light-blue ring-2 ring-opacity-50"
                : "bg-blueGray-800"
            } ${plan.isComplete ? "opacity-70" : "opacity-100"}`}
          >
            <header className={`flex items-center justify-between text-white`}>
              <h3
                className={`font-semibold ${isCurrentStep ? "text-orange-400" : ""} ${plan.isComplete && !isCurrentStep ? "line-through opacity-60" : ""}`}
              >
                {idx + 1}. {plan.title}
              </h3>
              <FontAwesomeIcon
                icon={
                  isCurrentStep
                    ? faCircle
                    : plan.isComplete
                      ? faCheckCircle
                      : faCircleDot
                }
                className={`text-xl ${isCurrentStep ? "text-orange animate-pulse" : plan.isComplete ? "text-light-blue" : "border-blueGray-500 rounded-full border-2 text-transparent"}`}
              />
            </header>
            <div className="mt-2 text-gray-300">
              <p>{plan.description}</p>
            </div>
            {isCurrentStep && (
              <div className="bg-light-blue absolute inset-0 animate-pulse rounded-lg bg-opacity-10"></div>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

export default PlanComponent;