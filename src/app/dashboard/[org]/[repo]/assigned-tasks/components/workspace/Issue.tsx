import React from "react";
import { faCircleDot } from "@fortawesome/free-solid-svg-icons";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { capitalize, statusStyles } from "~/app/utils";
import { type Issue } from "~/server/api/routers/events";
import MarkdownRenderer from "../../../components/MarkdownRenderer";

type IssueComponentProps = {
  issue: Issue | undefined;
};

export const IssueComponent: React.FC<IssueComponentProps> = ({ issue }) => (
  <div className="flex flex-col rounded-lg bg-gradient-to-b from-aurora-50/70 to-30% px-6 pb-6 pt-2 shadow-md transition-all dark:from-aurora-800/80 dark:to-aurora-800/20 dark:shadow-blueGray-800/80">
    <div className="mb-3 flex w-full items-center justify-between">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
        Issue
      </h2>
      {issue && (
        <a
          href={issue.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-full bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 hover:text-gray-100 dark:bg-black dark:hover:bg-blueGray-800"
        >
          <FontAwesomeIcon icon={faGithub} className="mr-2" />
          Open in GitHub
        </a>
      )}
    </div>
    {!issue ? (
      <div className="text-center text-gray-500 dark:text-gray-400">
        Waiting on GitHub Issue creation...
      </div>
    ) : (
      <div className="rounded-lg border border-aurora-500/30 bg-neutral-50 p-6 dark:border-aurora-600/30 dark:bg-gray-800">
        <article className="markdown bg-neutral-50 dark:bg-gray-800">
          <a
            href={issue.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-2xl font-semibold text-gray-900 hover:text-aurora-600 dark:text-white dark:hover:text-aurora-400"
          >
            {issue.title}
          </a>
          <div className="mb-4 mt-2 flex items-baseline justify-between">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              #{issue.issueId} opened on{" "}
              {new Date(issue.createdAt).toLocaleDateString()} by {issue.author}
            </div>
            <span className={`${statusStyles[issue.status]} text-sm`}>
              <FontAwesomeIcon icon={faCircleDot} size="xs" className="mr-1" />
              {capitalize(issue.status)}
            </span>
          </div>
          <hr className="my-3 w-full border-t border-gray-200 dark:border-gray-700" />
          <div className="prose max-w-none dark:prose-invert">
            <MarkdownRenderer>{issue.description}</MarkdownRenderer>
          </div>
        </article>
      </div>
    )}
  </div>
);

export default IssueComponent;
