"use client";
import { type ContextItem } from "~/server/utils/codebaseContext";
import CodebaseVisualizer from "./codebase/CodebaseVisualizer";
import { useTheme } from "next-themes";
import {
  setLastUsedRepoCookie,
  setHasStartedCodebaseGenerationCookie,
  getHasStartedCodebaseGenerationCookie,
  getIsLastUsedRepoCookie,
} from "~/app/actions";
import { useEffect } from "react";
import { api } from "~/trpc/react";
import LoadingIndicator from "../components/LoadingIndicator";

interface CodebaseParams {
  org: string;
  repo: string;
}

const Codebase: React.FC<CodebaseParams> = ({ org, repo }) => {
  const { resolvedTheme } = useTheme();

  const { data: contextItems, isLoading } = api.codebaseContext.getAll.useQuery(
    {
      org,
      repo,
    },
    {
      refetchOnWindowFocus: true,
    },
  );

  useEffect(() => {
    const fetchData = async (org: string, repo: string) => {
      if (org && repo) {
        for (let i = 0; i < 10; i++) {
          const hasStarted = await getHasStartedCodebaseGenerationCookie(
            org,
            repo,
          );
          if (!hasStarted) {
            void setHasStartedCodebaseGenerationCookie(org, repo);
          }
          const isLastUsedRepo = await getIsLastUsedRepoCookie(org, repo);
          if (!isLastUsedRepo) {
            void setLastUsedRepoCookie(org, repo);
          }
        }
      }
    };
    void fetchData(org, repo);
  }, [org, repo]);

  if (isLoading || !contextItems) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <LoadingIndicator />
      </div>
    );
  }
  if (contextItems.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h2 className="mb-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Generating Codebase Context
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            We&apos;re analyzing your codebase in the background. Please check
            back in a few minutes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <CodebaseVisualizer
      contextItems={contextItems}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
    />
  );
};

export default Codebase;
