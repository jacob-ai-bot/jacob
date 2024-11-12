import { Dialog, Transition } from "@headlessui/react";
import React, { Fragment, useState, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { formatDistanceToNow } from "date-fns";
import { type Prompt } from "~/server/api/routers/events";
import MarkdownRenderer from "../../../components/MarkdownRenderer";

type ComponentProps = {
  promptDetailsArray?: Prompt[];
};

export const PromptsComponent: React.FC<ComponentProps> = ({
  promptDetailsArray,
}) => {
  const [selectedPromptDetails, setSelectedPromptDetails] =
    useState<Prompt | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const openPanel = (promptDetails: Prompt) => {
    setSelectedPromptDetails(promptDetails);
    setIsPanelOpen(true);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
  };

  const totalSpending = useMemo(() => {
    if (!promptDetailsArray) return 0;
    return promptDetailsArray.reduce(
      (total, prompt) => total + (prompt.metadata.cost || 0),
      0,
    );
  }, [promptDetailsArray]);

  return (
    <div className="flex flex-col rounded-lg bg-gradient-to-b from-aurora-50/70 to-30% px-6 pb-6 pt-2 shadow-md transition-all dark:from-aurora-800/80 dark:to-aurora-800/20 dark:shadow-blueGray-800/80">
      <div className="mb-3 flex w-full items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          Prompts
        </h2>
      </div>
      <div className="mb-4 rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
        <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Total Spending: ${totalSpending.toFixed(2)}
        </p>
      </div>
      <div className="overflow-hidden rounded-lg border border-aurora-500/30 bg-neutral-50  dark:border-aurora-600/30 dark:bg-gray-800">
        <div className="hide-scrollbar overflow-auto">
          <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
            <thead className="bg-gray-100 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">
                  Timestamp
                </th>
                <th scope="col" className="px-6 py-3">
                  Model
                </th>
                <th scope="col" className="px-6 py-3">
                  Tokens (cost)
                </th>
              </tr>
            </thead>
            <tbody>
              {promptDetailsArray?.map((promptDetails, index) => (
                <tr
                  key={index}
                  className="cursor-pointer border-b bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                  onClick={() => openPanel(promptDetails)}
                >
                  <td className="px-6 py-4">
                    {formatDistanceToNow(
                      new Date(promptDetails?.metadata.timestamp ?? 0),
                      { addSuffix: true },
                    )}
                  </td>
                  <td className="px-6 py-4">{promptDetails.metadata.model}</td>
                  <td className="px-6 py-4">
                    {promptDetails.metadata.tokens > 1000
                      ? `${(promptDetails.metadata.tokens / 1000)?.toFixed(1)}K`
                      : promptDetails.metadata.tokens}{" "}
                    (${promptDetails.metadata.cost.toFixed(2)})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Transition appear show={isPanelOpen} as={Fragment}>
          <Dialog
            as="div"
            className="fixed inset-0 z-50 overflow-y-auto"
            onClose={closePanel}
          >
            <div className="my-8 min-h-screen px-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
              </Transition.Child>
              <span className="inline-block align-middle" aria-hidden="true">
                &#8203;
              </span>
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <div className="inline-block w-full max-w-7xl transform overflow-hidden rounded-md bg-neutral-50/90 p-6 text-left align-middle shadow-xl backdrop-blur-md transition-all dark:bg-gray-800">
                  <div className="absolute right-0 top-0 pr-4 pt-4">
                    <button
                      type="button"
                      className="rounded-md  text-gray-400 hover:text-gray-500 focus:outline-none dark:bg-gray-800 dark:text-gray-500 dark:hover:text-gray-400"
                      onClick={closePanel}
                    >
                      <span className="sr-only">Close</span>
                      <FontAwesomeIcon
                        icon={faTimes}
                        className="h-6 w-6"
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
                  >
                    Prompt Details
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Date:{" "}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatDistanceToNow(
                          new Date(
                            selectedPromptDetails?.metadata.timestamp ?? 0,
                          ),
                          { addSuffix: true },
                        )}
                      </span>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Total Cost:{" "}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {(
                          (selectedPromptDetails?.metadata.cost ?? 0) * 100
                        ).toFixed(2)}{" "}
                        cents
                      </span>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Request Timing:{" "}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {(
                          (selectedPromptDetails?.metadata.duration ?? 0) / 1000
                        ).toFixed(2)}{" "}
                        seconds
                      </span>
                    </p>
                  </div>
                  <div className="mt-4">
                    {selectedPromptDetails?.request.prompts.map(
                      (prompt, index) => (
                        <div key={index} className="mb-4 last:mb-0">
                          <h4 className="ml-1 text-lg font-medium text-gray-900 dark:text-white">
                            {prompt.promptType.charAt(0).toUpperCase() +
                              prompt.promptType.slice(1).toLowerCase()}{" "}
                            prompt
                          </h4>
                          <div className="mt-2 overflow-hidden rounded-md border border-gray-200 shadow-sm dark:border-gray-700">
                            <div className="markdown-chat bg-white/50 p-4 text-sm text-gray-700 dark:bg-black/50 dark:text-gray-300">
                              <MarkdownRenderer>
                                {prompt.prompt}
                              </MarkdownRenderer>
                            </div>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                  <div className="mt-4">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                      Response
                    </h4>
                    <div className="mt-2 overflow-hidden rounded-md border border-gray-200 shadow-sm dark:border-gray-700">
                      <div className="markdown-chat bg-white/50 p-4 text-sm text-gray-700 dark:bg-black/50 dark:text-gray-300">
                        <MarkdownRenderer>
                          {selectedPromptDetails?.response.prompt.prompt}
                        </MarkdownRenderer>
                      </div>
                    </div>
                  </div>
                </div>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition>
      </div>
    </div>
  );
};

export default PromptsComponent;
