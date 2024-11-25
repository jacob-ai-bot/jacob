"use client";

import React from "react";
import { IssueWriter } from "../issue-writer/IssueWriter";
import { KanbanBoard } from "./components/KanbanBoard";
import { CodebaseVisualizer } from "../code-visualizer/codebase/CodebaseVisualizer";
import { InfographicReport } from "./components/InfographicReport";
import { api } from "~/trpc/react";
import { useTheme } from "next-themes";

export default function OverviewPage({
  params,
}: {
  params: { org: string; repo: string };
}) {
  const { org, repo } = params;
  const { theme = "light" } = useTheme();
  const { data: project } = api.projects.getByOrgAndRepo.useQuery({
    org,
    repo,
  });
  const { data: contextItems = [] } = api.codebaseContext.getAll.useQuery(
    { projectId: project?.id ?? 0 },
    { enabled: !!project?.id },
  );

  return (
    <div className="flex h-full flex-col space-y-6 overflow-y-auto p-4">
      <div className="rounded-lg bg-white/50 p-6 shadow-sm dark:bg-slate-800/50">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Create New Issue
        </h2>
        <IssueWriter org={org} repo={repo} />
      </div>

      <div className="rounded-lg bg-white/50 p-6 shadow-sm dark:bg-slate-800/50">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Project Tasks
        </h2>
        <KanbanBoard org={org} repo={repo} />
      </div>

      <div className="rounded-lg bg-white/50 p-6 shadow-sm dark:bg-slate-800/50">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Codebase Overview
        </h2>
        <CodebaseVisualizer
          contextItems={contextItems}
          theme={theme as "light" | "dark"}
          org={org}
          repo={repo}
          projectId={project?.id}
        />
      </div>

      <div className="rounded-lg bg-white/50 p-6 shadow-sm dark:bg-slate-800/50">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Project Insights
        </h2>
        <InfographicReport projectId={project?.id} />
      </div>
    </div>
  );
}
