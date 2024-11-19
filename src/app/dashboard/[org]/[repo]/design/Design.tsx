import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";

interface DesignProps {
  org: string;
  repo: string;
}

const DesignComponent: React.FC<DesignProps> = ({ org, repo }) => {
  return (
    <div className="hide-scrollbar mx-auto flex h-full w-full max-w-4xl flex-col space-y-4 overflow-hidden px-4 md:flex-row md:space-x-4 md:space-y-0 md:px-0">
      <div className="hide-scrollbar h-full flex-1 overflow-y-auto">
        <div className="rounded-md bg-white/50 p-4 shadow-sm transition-colors dark:bg-slate-800/50">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-aurora-700 transition-colors dark:text-aurora-300 sm:text-2xl">
              Design
            </h2>
          </div>
          <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-colors dark:border-gray-700 dark:bg-gray-800 sm:p-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 transition-colors dark:text-white sm:text-xl">
                Transform Your Figma Designs into React Components
              </h3>
              <p className="mt-2 text-sm text-gray-600 transition-colors dark:text-gray-300">
                Effortlessly convert your Figma designs into React components
                with{" "}
                <a
                  href="https://www.figma.com/community/plugin/1326684504185921461/jacob-ai-codegen-connector"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-aurora-500 underline transition-colors hover:text-aurora-600 dark:text-aurora-300 dark:hover:text-aurora-400"
                >
                  JACoB: CodeGen Connector
                </a>
                .
              </p>
            </div>
            <div className="space-y-4 rounded-md bg-gray-50 p-4 transition-colors dark:bg-gray-900/50">
              <p className="text-sm text-gray-600 transition-colors dark:text-gray-300">
                1. Authenticate with GitHub and link your repositories
              </p>
              <p className="text-sm text-gray-600 transition-colors dark:text-gray-300">
                2. Select design elements in Figma
              </p>
              <p className="text-sm text-gray-600 transition-colors dark:text-gray-300">
                3. Provide additional instructions if needed
              </p>
              <p className="text-sm text-gray-600 transition-colors dark:text-gray-300">
                4. Click to initiate the automated code generation process
              </p>
              <p className="text-sm text-gray-600 transition-colors dark:text-gray-300">
                5. View JACoB&apos;s progress in the{" "}
                <a
                  href={`/dashboard/${org}/${repo}/assigned-tasks`}
                  className="font-semibold text-aurora-500 underline transition-colors hover:text-aurora-600 dark:text-aurora-300 dark:hover:text-aurora-400"
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
