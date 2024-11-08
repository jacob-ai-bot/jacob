import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faCircle,
  faCircleDot,
  faPlus,
  faRedo,
} from "@fortawesome/free-solid-svg-icons";
import { type Plan } from "~/server/api/routers/events";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { api } from "~/utils/api";

type ComponentProps = {
  planSteps: Plan[];
  currentPlanStep: number;
  projectId: number;
  issueNumber: number;
};

export const PlanComponent: React.FC<ComponentProps> = ({
  planSteps,
  currentPlanStep,
  projectId,
  issueNumber,
}) => {
  const [feedback, setFeedback] = useState("");
  const [isAddStepOpen, setIsAddStepOpen] = useState(false);
  const [newStep, setNewStep] = useState({
    title: "",
    instructions: "",
    filePath: "",
    exitCriteria: "",
  });

  const utils = api.useContext();
  const redoPlanMutation = api.planSteps.redoPlan.useMutation({
    onSuccess: () => {
      utils.planSteps.getByProjectAndIssue.invalidate({
        projectId,
        issueNumber,
      });
      setFeedback("");
    },
  });
  const createPlanStepMutation = api.planSteps.createPlanStep.useMutation({
    onSuccess: () => {
      utils.planSteps.getByProjectAndIssue.invalidate({
        projectId,
        issueNumber,
      });
      setIsAddStepOpen(false);
      setNewStep({
        title: "",
        instructions: "",
        filePath: "",
        exitCriteria: "",
      });
    },
  });

  const handleRedoPlan = () => {
    redoPlanMutation.mutate({ projectId, issueNumber, feedback });
  };

  const handleAddStep = () => {
    createPlanStepMutation.mutate({
      ...newStep,
      projectId,
      issueNumber,
      type: "EditExistingCode", // Default type, adjust as needed
    });
  };

  return (
    <div className="w-full bg-blueGray-900 p-2 pt-0 text-gray-100">
      <h2 className="border-b border-blueGray-700 py-2 text-lg font-semibold">
        Plan
      </h2>
      <div className="mb-4">
        <Textarea
          placeholder="Provide feedback on the current plan..."
          value={feedback}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setFeedback(e.target.value)
          }
          className="mt-2 w-full"
        />
        <Button
          onClick={handleRedoPlan}
          className="mt-2"
          disabled={redoPlanMutation.isLoading}
        >
          <FontAwesomeIcon icon={faRedo} className="mr-2" />
          Redo Plan
        </Button>
      </div>
      <div className="grid w-full grid-cols-1 gap-4 p-2 md:grid-cols-2 lg:grid-cols-3">
        {planSteps.map((plan, idx) => {
          const isCurrentStep = !plan.isComplete && idx === currentPlanStep;
          return (
            <div
              key={plan.id}
              className={`relative max-w-sm transform rounded-lg p-4 shadow-lg transition-all duration-300 ease-in-out hover:scale-105 ${
                idx === currentPlanStep
                  ? "bg-blueGray-700 ring-2 ring-light-blue ring-opacity-50"
                  : "bg-blueGray-800"
              } ${plan.isComplete ? "opacity-70" : "opacity-100"}`}
            >
              <header
                className={`flex items-center justify-between text-white`}
              >
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
                  className={`h-3 w-3 text-xl ${isCurrentStep ? "animate-pulse text-orange" : plan.isComplete ? "text-light-blue" : "rounded-full border-2 border-blueGray-500 text-transparent"}`}
                />
              </header>
              <div className="mt-2 text-gray-300">
                <p>{plan.description}</p>
              </div>
              {isCurrentStep && (
                <div className="absolute inset-0 animate-pulse rounded-lg bg-light-blue bg-opacity-10"></div>
              )}
            </div>
          );
        })}
      </div>
      <Dialog open={isAddStepOpen} onOpenChange={setIsAddStepOpen}>
        <DialogTrigger asChild>
          <Button className="mt-4">
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Add Plan Step
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Plan Step</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              placeholder="Title"
              value={newStep.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewStep({ ...newStep, title: e.target.value })
              }
            />
            <Textarea
              placeholder="Instructions"
              value={newStep.instructions}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setNewStep({ ...newStep, instructions: e.target.value })
              }
            />
            <Input
              placeholder="File Path"
              value={newStep.filePath}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewStep({ ...newStep, filePath: e.target.value })
              }
            />
            <Input
              placeholder="Exit Criteria"
              value={newStep.exitCriteria}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewStep({ ...newStep, exitCriteria: e.target.value })
              }
            />
          </div>
          <Button
            onClick={handleAddStep}
            disabled={createPlanStepMutation.isLoading}
          >
            Add Step
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlanComponent;
