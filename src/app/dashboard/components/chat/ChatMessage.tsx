import { type FC, useState, useEffect } from "react";
import { Role, type Message, SpecialPhrases } from "~/types";
import Markdown, { type Components } from "react-markdown";
import gfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { faArrowRight, faClipboard } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface Props {
  message: Message;
  onCreateNewTask: () => void;
  onUpdateIssue: () => void;
  isResponding?: boolean;
}

export const ChatMessage: FC<Props> = ({
  message,
  onCreateNewTask,
  onUpdateIssue,
}) => {
  const [content, setContent] = useState<string>(message.content);

  useEffect(() => {
    if (
      message.role === Role.ASSISTANT &&
      message.content.includes(SpecialPhrases.CREATE_TASK)
    ) {
      setContent(message.content.replace(SpecialPhrases.CREATE_TASK, ""));
    } else if (
      message.role === Role.ASSISTANT &&
      message.content.includes(SpecialPhrases.UPDATE_TASK)
    ) {
      setContent(message.content.replace(SpecialPhrases.UPDATE_TASK, ""));
    } else {
      setContent(message.content);
    }
  }, [message.content, message.role]);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const renderers: Partial<Components | any> = {
    code: ({
      node,
      inline,
      className,
      children,
      ...props
    }: {
      node: any;
      inline: boolean;
      className: string;
      children: React.ReactNode;
    }) => {
      const match = /language-(\w+)/.exec(className || "");
      if (!inline && match) {
        return (
          <div className="relative">
            <button
              className="absolute right-2 top-0 rounded bg-gray-800 p-1 text-white"
              onClick={() => copyToClipboard(String(children))}
            >
              <FontAwesomeIcon icon={faClipboard} />
            </button>
            <SyntaxHighlighter
              style={oneDark}
              language={match[1]}
              PreTag="div"
              {...props}
            >
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
          </div>
        );
      } else if (inline) {
        // Render inline code with `<code>` instead of `<div>`
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      } else {
        // Fallback for non-highlighted code
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      }
    },
  };

  return (
    <div
      className={`flex flex-col ${message.role === Role.ASSISTANT ? "items-start" : "items-end"}`}
    >
      <ToastContainer />
      {content?.length > 0 && (
        <div
          className={`markdown-chat flex flex-col font-figtree ${message.role === Role.ASSISTANT ? "border border-blueGray-600/50 " : "bg-gradient-to-l from-blueGray-700/50 to-blueGray-800/50"} hide-scrollbar max-w-[95%] rounded-md px-2  shadow-md`}
          style={{ overflowWrap: "anywhere" }}
        >
          <Markdown
            remarkPlugins={[gfm]}
            className={`px-1 py-1`}
            components={renderers}
          >
            {content}
          </Markdown>
        </div>
      )}
      {message.role === Role.ASSISTANT &&
        message.content.includes(SpecialPhrases.CREATE_TASK) && (
          <div className="mt-2 flex justify-center self-center">
            <div
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded border border-gray-400 bg-white px-6 py-2"
              onClick={onCreateNewTask}
            >
              <div className="text-center text-xs font-medium text-black">
                Add Task to Queue
              </div>
              <div className="relative text-black">
                <FontAwesomeIcon icon={faArrowRight} />
              </div>
            </div>
          </div>
        )}

      {message.role === Role.ASSISTANT &&
        message.content.includes(SpecialPhrases.UPDATE_TASK) && (
          <div className="mt-2 flex justify-center self-center">
            <div
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded border border-gray-400 bg-white px-6 py-2"
              onClick={onUpdateIssue}
            >
              <div className="text-center text-xs font-medium text-black">
                Update GitHub Issue
              </div>
              <div className="relative text-black">
                <FontAwesomeIcon icon={faArrowRight} />
              </div>
            </div>
          </div>
        )}
    </div>
  );
};
