// components/CodePreview.tsx
import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface CodePreviewProps {
  code: string;
}

const CodePreview: React.FC<CodePreviewProps> = ({ code }) => {
  return (
    <div className="rounded-lg bg-blueGray-900 p-4 shadow-inner">
      <SyntaxHighlighter
        language="typescript"
        style={vscDarkPlus}
        customStyle={{
          backgroundColor: "transparent",
          fontSize: "14px",
          lineHeight: "1.5",
        }}
        showLineNumbers
        wrapLines
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

export default CodePreview;
