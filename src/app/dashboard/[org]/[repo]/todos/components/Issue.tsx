import React, { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit } from "@fortawesome/free-solid-svg-icons";
import MarkdownRenderer from "../../components/MarkdownRenderer";
import { api } from "~/trpc/react";
import { toast } from "react-toastify";

interface IssueProps {
  org: string;
  repo: string;
  issueId: number;
  initialTitle: string;
  initialBody: string;
}

const Issue: React.FC<IssueProps> = ({
  org,
  repo,
  issueId,
  initialTitle,
  initialBody,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTitle(initialTitle);
    setBody(initialBody);
  }, [initialTitle, initialBody]);

  useEffect(() => {
    if (isEditing) {
      titleInputRef.current?.focus();
    }
  }, [isEditing]);

  const { mutateAsync: updateIssue } = api.github.updateIssue.useMutation();

  const handleSave = async () => {
    try {
      await updateIssue({
        repo: `${org}/${repo}`,
        id: issueId,
        title,
        body,
      });
      setIsEditing(false);
      toast.success("Issue updated successfully!");
    } catch (error) {
      console.error("Error updating issue:", error);
      toast.error("Failed to update the issue.");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setTitle(initialTitle);
    setBody(initialBody);
  };

  return (
    <div className="rounded-lg bg-gradient-to-b from-aurora-50/70 to-50% p-6 shadow-md transition-all dark:from-aurora-800/80 dark:to-aurora-800/20 dark:shadow-blueGray-800/80">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold text-aurora-700 dark:text-blueGray-300">
          Issue
        </h3>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-xl text-aurora-600 transition-colors hover:text-aurora-700 dark:text-blueGray-300 dark:hover:text-blueGray-200"
          >
            <FontAwesomeIcon icon={faEdit} className="mr-1" />
          </button>
        )}
      </div>
      {isEditing ? (
        <div className="space-y-4">
          <input
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-gray-300 p-2 text-lg font-semibold focus:outline-none focus:ring-0 dark:border-gray-600 dark:bg-gray-800 dark:focus:border-blue-400 dark:focus:ring-blue-800"
            placeholder="Issue Title"
          />
          <textarea
            ref={bodyTextareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="h-96 w-full rounded-md border border-gray-300 p-3 focus:outline-none focus:ring-0 dark:border-gray-600 dark:bg-gray-800 dark:focus:border-blue-400 dark:focus:ring-blue-800"
            placeholder="Describe the issue..."
          />
          <div className="flex justify-end space-x-2">
            <button
              onClick={handleCancel}
              className="flex items-center rounded-md bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center rounded-md bg-aurora-500 px-4 py-2 text-white transition-colors hover:bg-aurora-600 dark:bg-aurora-800/80 dark:hover:bg-aurora-700/80"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <>
          <h4 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h4>
          <div className="markdown-chat prose dark:prose-invert">
            <MarkdownRenderer>{body}</MarkdownRenderer>
          </div>
        </>
      )}
    </div>
  );
};

export default Issue;
