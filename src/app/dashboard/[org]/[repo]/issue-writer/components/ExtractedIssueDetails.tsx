import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import MarkdownRenderer from "../../components/MarkdownRenderer";
import React, { useEffect, useState, useMemo } from "react";

export const ExtractedIssueDetails: React.FC<{
  feedback: string | null;
  rewrittenIssue: string | null;
  onUpdateIssue: (issueBody: string) => void;
  isEvaluating: boolean;
}> = ({ feedback, rewrittenIssue, onUpdateIssue, isEvaluating }) => {
  const phrases = useMemo(
    () => [
      "Gathering Codebase Context...",
      "Analyzing Issue Details...",
      "Loading Project Settings...",
      "Contacting AI Model...",
      "Processing Evaluation...",
      "Compiling Results...",
      "Finalizing Output...",
      "Optimizing Suggestions...",
      "Fetching Additional Data...",
      "Almost There...",
    ],
    [],
  );

  const [currentPhrase, setCurrentPhrase] = useState(phrases[0]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isEvaluating) {
      interval = setInterval(
        () => {
          const randomIndex = Math.floor(Math.random() * phrases.length);
          setCurrentPhrase(phrases[randomIndex]);
        },
        Math.random() * (10000 - 5000) + 5000,
      );
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isEvaluating, phrases]);

  return (
    <div className="hide-scrollbar h-full overflow-hidden overflow-y-auto rounded-md bg-white/80 px-6 shadow-sm dark:bg-slate-800">
      <h3 className="mb-2 mt-6 font-crimson text-3xl font-semibold text-gray-800 dark:text-gray-200">
        Issue Feedback
      </h3>

      <div className="space-y-6">
        <div className="rounded-lg bg-gray-100/50 p-4 dark:bg-slate-700">
          <MarkdownRenderer className="markdown-chat prose prose-sm text-gray-600 dark:text-gray-400">
            {feedback ?? "No feedback provided"}
          </MarkdownRenderer>
        </div>

        {rewrittenIssue && (
          <div className="mt-8">
            <h3 className="mb-2 font-crimson text-3xl font-semibold text-gray-800 dark:text-gray-200">
              Suggested Issue Text
            </h3>
            <div className="rounded-lg bg-gray-100/50 p-4 dark:bg-slate-700">
              <MarkdownRenderer className="markdown-chat prose prose-sm max-w-none text-gray-600 dark:prose-invert dark:text-gray-400">
                {rewrittenIssue}
              </MarkdownRenderer>
            </div>
          </div>
        )}
      </div>
      <div className="from:10% via:20% sticky bottom-0 mt-6 flex flex-col items-center bg-gradient-to-b from-white/80 via-white to-white p-6 dark:from-slate-800/80 dark:to-slate-800">
        <button
          onClick={() => onUpdateIssue(rewrittenIssue ?? "")}
          className="mt-2 rounded-md bg-blossom-500 px-12 py-2 text-white shadow-sm transition-colors hover:bg-blossom-700 focus:outline-none focus:ring-0 focus:ring-offset-0 dark:bg-slate-600 dark:hover:bg-slate-700 dark:focus:ring-offset-slate-800"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
          Update Issue Draft
        </button>
      </div>
      {isEvaluating && (
        <div className="mt-6 flex items-center justify-center">
          <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            {currentPhrase}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExtractedIssueDetails;
