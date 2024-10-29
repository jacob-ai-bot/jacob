import React, { useState, useEffect } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "next-themes";

interface CodeViewerProps {
  filePath: string;
}

const CodeViewer: React.FC<CodeViewerProps> = ({ filePath }) => {
  const [code, setCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const fetchCode = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/code?filePath=${encodeURIComponent(filePath)}`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch code");
        }
        const data = await response.text();
        setCode(data);
      } catch (err) {
        setError("Failed to load code. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCode();
  }, [filePath]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  const language = filePath.split(".").pop() || "text";

  return (
    <SyntaxHighlighter
      language={language}
      style={resolvedTheme === "dark" ? oneDark : oneLight}
      customStyle={{
        margin: 0,
        padding: "1rem",
        fontSize: "14px",
        borderRadius: "4px",
      }}
    >
      {code}
    </SyntaxHighlighter>
  );
};

export default CodeViewer;
