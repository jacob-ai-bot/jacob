import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronUp,
  faChevronDown,
  faEdit,
  faArchive,
} from "@fortawesome/free-solid-svg-icons";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "~/trpc/react";
import { toast } from "react-toastify";
import { PlanningAgentActionType } from "~/server/db/enums";
import MarkdownRenderer from "../../components/MarkdownRenderer";
import { type PlanStep } from "~/server/db/tables/planSteps.table";

interface PlanStepProps {
  step: PlanStep;
  onUpdate: () => void;
  onDelete: () => void;
  isLastItem: boolean;
}

const PlanStepComponent: React.FC<PlanStepProps> = ({
  step,
  onUpdate,
  onDelete,
  isLastItem,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedStep, setEditedStep] = useState<PlanStep>(step);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const { mutateAsync: updatePlanStep } = api.planSteps.update.useMutation();
  const { mutateAsync: deletePlanStep } = api.planSteps.delete.useMutation();

  const handleSave = async () => {
    try {
      await updatePlanStep(editedStep);
      setIsEditing(false);
      onUpdate();
      toast.success("Plan step updated successfully!");
    } catch (error) {
      console.error("Error updating plan step:", error);
      toast.error("Failed to update the plan step.");
    }
  };

  const handleArchive = () => {
    setShowConfirmation(true);
  };

  const handleCancelArchive = () => {
    setShowConfirmation(false);
  };

  const handleConfirmArchive = async () => {
    setIsArchiving(true);
    try {
      await deletePlanStep(step.id);
      onDelete();
      toast.success("Plan step archived successfully!");
    } catch (error) {
      console.error("Error archiving plan step:", error);
      toast.error("Failed to archive the plan step.");
    } finally {
      setIsArchiving(false);
      setShowConfirmation(false);
    }
  };

  return (
    <div
      className={`mb-6 pb-4 ${isLastItem ? "" : "border-b border-meadow-800/20 dark:border-gray-700/30"}`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-left"
      >
        <h4 className="text-lg font-medium text-gray-800 dark:text-gray-300">
          {step.title}
        </h4>
        <FontAwesomeIcon
          icon={isOpen ? faChevronUp : faChevronDown}
          className="ml-2 text-gray-500 transition-transform dark:text-gray-400"
        />
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
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="title"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Title
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={editedStep.title}
                    onChange={(e) =>
                      setEditedStep({ ...editedStep, title: e.target.value })
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 p-2 dark:border-slate-600 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label
                    htmlFor="type"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Type
                  </label>
                  <select
                    id="type"
                    value={editedStep.type}
                    onChange={(e) =>
                      setEditedStep({
                        ...editedStep,
                        type: e.target.value as PlanningAgentActionType,
                      })
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 p-2 dark:border-slate-600 dark:bg-slate-800"
                  >
                    {Object.values(PlanningAgentActionType).map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="filePath"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    File Path
                  </label>
                  <input
                    id="filePath"
                    type="text"
                    value={editedStep.filePath}
                    onChange={(e) =>
                      setEditedStep({ ...editedStep, filePath: e.target.value })
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 p-2 dark:border-slate-600 dark:bg-slate-800"
                    placeholder="File Path"
                  />
                </div>
                <div>
                  <label
                    htmlFor="instructions"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Instructions
                  </label>
                  <textarea
                    id="instructions"
                    value={editedStep.instructions}
                    onChange={(e) =>
                      setEditedStep({
                        ...editedStep,
                        instructions: e.target.value,
                      })
                    }
                    className="mt-1 h-32 w-full rounded-md border border-slate-300 p-2 dark:border-slate-600 dark:bg-slate-800"
                    placeholder="Instructions"
                  />
                </div>
                <div>
                  <label
                    htmlFor="exitCriteria"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Exit Criteria
                  </label>
                  <textarea
                    id="exitCriteria"
                    value={editedStep.exitCriteria ?? ""}
                    onChange={(e) =>
                      setEditedStep({
                        ...editedStep,
                        exitCriteria: e.target.value,
                      })
                    }
                    className="mt-1 h-32 w-full rounded-md border border-slate-300 p-2 dark:border-slate-600 dark:bg-slate-800"
                    placeholder="Exit Criteria"
                  />
                </div>
                <div>
                  <label
                    htmlFor="dependencies"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Dependencies
                  </label>
                  <input
                    id="dependencies"
                    type="text"
                    value={editedStep.dependencies ?? ""}
                    onChange={(e) =>
                      setEditedStep({
                        ...editedStep,
                        dependencies: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 p-2 dark:border-slate-600 dark:bg-slate-800"
                    placeholder="Dependencies"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="rounded-md bg-slate-100 px-4 py-2 text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="rounded-md bg-slate-800 px-4 py-2 text-white transition-colors hover:bg-slate-900 dark:bg-slate-600 dark:hover:bg-slate-500"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p>
                  <span className="font-bold text-slate-900/70 dark:text-slate-300/50">
                    Type:
                  </span>{" "}
                  <span className="text-neutral-700 dark:text-neutral-400">
                    {step.type}
                  </span>
                </p>
                <p>
                  <span className="font-bold text-slate-900/70 dark:text-slate-300/50">
                    File Path:
                  </span>{" "}
                  <span className="text-neutral-700 dark:text-neutral-400">
                    {step.filePath}
                  </span>
                </p>
                <div>
                  <span className="font-bold text-slate-900/70 dark:text-slate-300/50">
                    Instructions:
                  </span>
                  <MarkdownRenderer className="markdown-chat">
                    {step.instructions}
                  </MarkdownRenderer>
                </div>
                <div>
                  <span className="font-bold text-slate-900/70 dark:text-slate-300/50">
                    Exit Criteria:
                  </span>
                  <MarkdownRenderer className="markdown-chat">
                    {step.exitCriteria ?? ""}
                  </MarkdownRenderer>
                </div>
                {step.dependencies && (
                  <p>
                    <span className="font-bold text-slate-900/70 dark:text-slate-300/50">
                      Dependencies:
                    </span>{" "}
                    {step.dependencies}
                  </p>
                )}
                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-meadow-900/80 transition-colors hover:text-meadow-900/80 dark:text-meadow-400/50 dark:hover:text-meadow-300/70"
                  >
                    <FontAwesomeIcon icon={faEdit} className="mr-2" />
                    Edit
                  </button>
                  <button
                    onClick={handleArchive}
                    className="text-slate-600/80 transition-colors hover:text-slate-700 dark:text-slate-400/70 dark:hover:text-slate-300/90"
                  >
                    <FontAwesomeIcon icon={faArchive} className="mr-2" />
                    Archive
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {showConfirmation && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="rounded-lg bg-white p-4 shadow-lg dark:bg-neutral-800">
            <p className="mb-4 text-sm text-neutral-700 dark:text-neutral-400">
              Are you sure you want to archive this plan step?
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={handleCancelArchive}
                className="rounded px-3 py-1 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmArchive}
                className="rounded bg-meadow-800/70 px-3 py-1 text-sm text-white hover:bg-meadow-800/80 dark:bg-meadow-700/50 dark:hover:bg-meadow-700/60"
              >
                {isArchiving ? "Archiving..." : "Archive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface PlanProps {
  projectId: number;
  issueNumber: number;
}

const Plan: React.FC<PlanProps> = ({ projectId, issueNumber }) => {
  const {
    data: planSteps,
    isLoading,
    refetch,
  } = api.planSteps.getByProjectAndIssue.useQuery({
    projectId,
    issueNumber,
  });

  if (isLoading) {
    return <div>Loading plan...</div>;
  }

  if (!planSteps || planSteps.length === 0) {
    return <div>No plan steps found.</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-meadow-900/80 dark:text-meadow-300/70">
            Plan
          </h3>
          <p className="text-sm text-slate-900/60 dark:text-slate-300/50">
            This is the plan that will be used to complete the issue. Review
            this carefully and make any changes as needed.
          </p>
        </div>
      </div>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1,
            },
          },
        }}
        className="space-y-4"
      >
        {planSteps.map((step, index) => (
          <motion.div
            key={step.id}
            variants={{
              hidden: { y: 20, opacity: 0 },
              visible: { y: 0, opacity: 1 },
            }}
          >
            <PlanStepComponent
              step={step}
              onUpdate={refetch}
              onDelete={refetch}
              isLastItem={index === planSteps.length - 1}
            />
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};

export default Plan;
