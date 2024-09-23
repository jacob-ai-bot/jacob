import MarkdownRenderer from "../../components/MarkdownRenderer";

export const ExtractedIssueDetails: React.FC<{
  feedback: string | null;
  rewrittenIssue: string | null;
  onUpdateIssue: (issueBody: string) => void;
}> = ({ feedback, rewrittenIssue, onUpdateIssue }) => {
  return (
    <div className="hide-scrollbar h-full overflow-y-auto rounded-md bg-white/80 px-6 shadow-sm dark:bg-slate-800">
      <h3 className="mb-2 mt-6 font-crimson text-3xl font-semibold text-gray-800 dark:text-gray-200">
        Issue Feedback
      </h3>

      <div className="space-y-6">
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-slate-700">
          <MarkdownRenderer className="markdown-chat prose prose-sm text-gray-600 dark:text-gray-400">
            {feedback ?? "No feedback provided"}
          </MarkdownRenderer>
        </div>

        {rewrittenIssue && (
          <div className="mt-8">
            <h3 className="mb-2 font-crimson text-3xl font-semibold text-gray-800 dark:text-gray-200">
              Suggested Issue Text
            </h3>
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-slate-700">
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
          className="mt-2 rounded-md bg-blossom-500 px-12 py-2 text-white shadow-sm transition-colors hover:bg-blossom-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:bg-slate-600 dark:hover:bg-slate-700 dark:focus:ring-offset-slate-800"
        >
          Update Issue
        </button>
      </div>
    </div>
  );
};

export default ExtractedIssueDetails;
