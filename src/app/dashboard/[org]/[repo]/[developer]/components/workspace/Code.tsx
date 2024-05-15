import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboard } from "@fortawesome/free-solid-svg-icons";
import { ToastContainer, toast } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";
import { removeMarkdownCodeblocks } from "~/app/utils";
import { type Code } from "~/server/api/routers/events";

type ComponentProps = {
  codeFiles?: Code[];
};

const copyToClipboard = async (text: string) => {
  await navigator.clipboard.writeText(text);
  toast.success("Copied to clipboard");
};

export const CodeComponent: React.FC<ComponentProps> = ({ codeFiles }) => (
  <div className="w-full p-2 pt-0 text-gray-100">
    <ToastContainer />
    {codeFiles?.map((codeFile, index) => (
      <div key={index} className="mb-2 last:mb-0">
        <div className="py-2">
          <div className="flex justify-between">
            <h2 className="text-lg font-semibold">
              {codeFile.fileName?.split("/").pop() ?? ""}
            </h2>
            <p className="font-mono text-sm opacity-75">{codeFile.fileName}</p>
          </div>
          <hr className="my-2 border-t border-gray-700" />
        </div>
        <div className="group relative">
          <button
            className="absolute right-2 top-2 z-10 h-8 w-8 items-center justify-center rounded text-blueGray-500 hover:text-blueGray-400"
            onClick={() => copyToClipboard(codeFile.codeBlock)}
            title="Copy to Clipboard"
          >
            <FontAwesomeIcon icon={faClipboard} size="sm" />
          </button>
          <SyntaxHighlighter
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            style={oneDark}
            language={codeFile.language?.toLowerCase() ?? "javascript"}
            showLineNumbers
          >
            {removeMarkdownCodeblocks(codeFile.codeBlock ?? "")}
          </SyntaxHighlighter>
        </div>
      </div>
    ))}
  </div>
);

export default CodeComponent;
