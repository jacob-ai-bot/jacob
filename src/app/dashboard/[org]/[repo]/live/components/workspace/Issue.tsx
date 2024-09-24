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
  <div className="h-full w-full overflow-clip  bg-gray-900 px-2 text-gray-200">
    <div className="w-full pt-2">
      <div className="flex w-full items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Issue</h2>
        {issue && (
          <a
            href={issue.link}
            target="_blank"
            className="inline-flex items-center rounded bg-blueGray-500 px-4 py-1.5 font-bold text-white  duration-200 hover:bg-blueGray-600"
          >
            <FontAwesomeIcon icon={faGithub} />
            <span className="ml-2 text-xs">Open in GitHub</span>
          </a>
        )}
      </div>
      <hr className="mt-2 border-t border-gray-700" />
    </div>
    {!issue ? (
      <div className="text-center text-gray-400">
        Waiting on GitHub Issue creation...
      </div>
    ) : (
      <div className="hide-scrollbar h-full overflow-auto pb-20 pt-2">
        <article className="markdown rounded-lg bg-gray-800 p-6 shadow">
          <a
            href={issue.link}
            target="_blank"
            className="font-sans text-2xl font-semibold text-white"
          >
            {issue.title}
          </a>
          <div className="mb-4 mt-2 flex items-baseline justify-between">
            <div className="text-xs">
              #{issue.issueId} opened on{" "}
              {new Date(issue.createdAt).toLocaleDateString()} by {issue.author}
            </div>
            <span className={statusStyles[issue.status]}>
              <FontAwesomeIcon icon={faCircleDot} size="xs" />{" "}
              {capitalize(issue.status)}
            </span>
          </div>
          <hr className="my-3 w-full border-t border-gray-200" />
          <MarkdownRenderer>{issue.description}</MarkdownRenderer>
        </article>
        <div className="relative py-3">
          <div className="absolute left-16 top-0 h-full w-0.5 bg-gray-600/50"></div>
        </div>
      </div>
    )}
  </div>
);

export default IssueComponent;
