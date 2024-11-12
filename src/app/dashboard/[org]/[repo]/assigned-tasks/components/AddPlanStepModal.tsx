import React, { useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { api } from "~/trpc/react";
import { PlanningAgentActionType } from "~/server/db/enums";

interface AddPlanStepModalProps {
  isOpen: boolean;
  onClose: () => void;
  org: string;
  repo: string;
}

const AddPlanStepModal: React.FC<AddPlanStepModalProps> = ({
  isOpen,
  onClose,
  org,
  repo,
}) => {
  const [type, setType] = useState<PlanningAgentActionType>(
    PlanningAgentActionType.EditExistingCode,
  );
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [filePath, setFilePath] = useState("");
  const [exitCriteria, setExitCriteria] = useState("");
  const [dependencies, setDependencies] = useState("");

  const { mutateAsync: createPlanStep } = api.planSteps.create.useMutation();

  const handleSubmit = async () => {
    try {
      await createPlanStep({
        projectId: 1, // Replace with actual projectId
        issueNumber: 1, // Replace with actual issueNumber
        type,
        title,
        instructions,
        filePath,
        exitCriteria,
        dependencies: dependencies || null,
      });
      onClose();
    } catch (error) {
      console.error("Failed to create plan step:", error);
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div>
                  <div className="mt-3 text-center sm:mt-5">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900"
                    >
                      Add New Plan Step
                    </Dialog.Title>
                    <div className="mt-2">
                      <form className="space-y-4">
                        <div>
                          <label
                            htmlFor="type"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Type
                          </label>
                          <select
                            id="type"
                            name="type"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            value={type}
                            onChange={(e) =>
                              setType(e.target.value as PlanningAgentActionType)
                            }
                          >
                            <option
                              value={PlanningAgentActionType.EditExistingCode}
                            >
                              Edit Existing Code
                            </option>
                            <option
                              value={PlanningAgentActionType.CreateNewCode}
                            >
                              Create New Code
                            </option>
                          </select>
                        </div>
                        <div>
                          <label
                            htmlFor="title"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Title
                          </label>
                          <input
                            type="text"
                            id="title"
                            name="title"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="instructions"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Instructions
                          </label>
                          <textarea
                            id="instructions"
                            name="instructions"
                            rows={4}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="filePath"
                            className="block text-sm font-medium text-gray-700"
                          >
                            File Path
                          </label>
                          <input
                            type="text"
                            id="filePath"
                            name="filePath"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            value={filePath}
                            onChange={(e) => setFilePath(e.target.value)}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="exitCriteria"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Exit Criteria
                          </label>
                          <input
                            type="text"
                            id="exitCriteria"
                            name="exitCriteria"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            value={exitCriteria}
                            onChange={(e) => setExitCriteria(e.target.value)}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="dependencies"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Dependencies
                          </label>
                          <input
                            type="text"
                            id="dependencies"
                            name="dependencies"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            value={dependencies}
                            onChange={(e) => setDependencies(e.target.value)}
                          />
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:col-start-2 sm:text-sm"
                    onClick={handleSubmit}
                  >
                    Add Step
                  </button>
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default AddPlanStepModal;
