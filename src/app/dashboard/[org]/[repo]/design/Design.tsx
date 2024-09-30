import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";

interface DesignProps {
  org: string;
  repo: string;
}

const DesignComponent: React.FC<DesignProps> = ({ org, repo }) => {
  return (
    <div className="hide-scrollbar mx-auto flex h-full w-full max-w-4xl flex-row space-x-4 overflow-hidden">
      <div className="hide-scrollbar h-full flex-1 overflow-y-auto">
        <div className="rounded-md bg-white/50 p-4 shadow-sm dark:bg-slate-800">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-aurora-700 dark:text-aurora-300">
              Design
            </h2>
          </div>
          <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Transform Your Figma Designs into React Components
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Effortlessly convert your Figma designs into React components
                with{" "}
                <a
                  href="https://www.figma.com/community/plugin/1326684504185921461/jacob-ai-codegen-connector"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-aurora-500 underline hover:text-aurora-600 dark:text-aurora-300 dark:hover:text-aurora-400"
                >
                  JACoB: CodeGen Connector
                </a>
                .
              </p>
            </div>
            <div className="space-y-4 rounded-md bg-gray-50 p-4 dark:bg-gray-900/50">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                1. Authenticate with GitHub and link your repositories
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                2. Select design elements in Figma
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                3. Provide additional instructions if needed
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                4. Click to initiate the automated code generation process
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                5. View JACoB&apos;s progress in the{" "}
                <a
                  href={`/dashboard/${org}/${repo}/assigned-tasks`}
                  className="font-semibold text-aurora-500 underline hover:text-aurora-600 dark:text-aurora-300 dark:hover:text-aurora-400"
                >
                  Assigned Tasks
                </a>{" "}
                section of the dashboard
              </p>
            </div>
            <div className="flex justify-end">
              <a
                href="https://www.figma.com/community/plugin/1326684504185921461/jacob-ai-codegen-connector"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-md bg-aurora-50 px-4 py-2 text-sm font-medium text-aurora-700 transition-colors hover:bg-aurora-100 dark:bg-aurora-900/30 dark:text-aurora-300 dark:hover:bg-aurora-800/50"
              >
                Install Plugin
                <FontAwesomeIcon
                  icon={faExternalLinkAlt}
                  className="ml-2 h-3 w-3"
                />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignComponent;
