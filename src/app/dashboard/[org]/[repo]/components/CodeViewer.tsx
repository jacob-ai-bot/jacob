import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "next-themes";
import { api } from "~/trpc/react";
import { useParams } from "next/navigation";
import LoadingIndicator from "./LoadingIndicator";
interface CodeViewerProps {
  filePath: string;
}

const CodeViewer: React.FC<CodeViewerProps> = ({ filePath }) => {
  const { resolvedTheme } = useTheme();
  // get the repo and org from the url
  const { repo, org } = useParams();

  const {
    data: codeFiles,
    isError,
    isLoading,
  } = api.github.fetchFileContents.useQuery({
    repo: repo as string,
    org: org as string,
    filePaths: [filePath],
  });

  if (isLoading) {
    return <LoadingIndicator />;
  }

  if (isError) {
    return <div className="text-red-500">Failed to load code.</div>;
  }

  const language = filePath.split(".").pop() ?? "text";

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
      {codeFiles?.[0]?.content ?? ""}
    </SyntaxHighlighter>
  );
};

export default CodeViewer;
