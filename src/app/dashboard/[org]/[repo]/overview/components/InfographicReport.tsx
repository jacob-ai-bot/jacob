"use client";

import React from "react";
import { api } from "~/trpc/react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
);

interface InfographicReportProps {
  projectId: number | undefined;
}

export function InfographicReport({ projectId }: InfographicReportProps) {
  const { data: research = [] } = api.research.getProjectResearch.useQuery(
    { projectId: projectId ?? 0 },
    { enabled: !!projectId },
  );

  const todoStats = api.todos.getStats.useQuery().data ?? {
    total: 0,
    completed: 0,
    inProgress: 0,
  };

  const completionRate = todoStats.total
    ? ((todoStats.completed / todoStats.total) * 100).toFixed(1)
    : "0";

  const todoData = {
    labels: ["To Do", "In Progress", "Done"],
    datasets: [
      {
        data: [
          todoStats.total - todoStats.completed - todoStats.inProgress,
          todoStats.inProgress,
          todoStats.completed,
        ],
        backgroundColor: [
          "rgba(255, 186, 0, 0.5)",
          "rgba(51, 255, 127, 0.5)",
          "rgba(0, 172, 255, 0.5)",
        ],
        borderColor: [
          "rgba(255, 186, 0, 1)",
          "rgba(51, 255, 127, 1)",
          "rgba(0, 172, 255, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  const researchSummary = research.reduce(
    (acc, item) => {
      const words = item.answer.split(" ").length;
      acc.totalAnswers++;
      acc.totalWords += words;
      return acc;
    },
    { totalAnswers: 0, totalWords: 0 },
  );

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-slate-700">
        <h3 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Task Progress
        </h3>
        <div className="aspect-square">
          <Doughnut
            data={todoData}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: "bottom",
                },
              },
            }}
          />
        </div>
        <div className="mt-4 text-center text-sm text-neutral-600 dark:text-neutral-400">
          Completion Rate: {completionRate}%
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-slate-700">
        <h3 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Project Research Insights
        </h3>
        <div className="space-y-4">
          <div className="rounded-lg bg-neutral-50 p-4 dark:bg-slate-600">
            <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Total Research Questions
            </h4>
            <p className="text-2xl font-bold text-aurora-600 dark:text-aurora-400">
              {researchSummary.totalAnswers}
            </p>
          </div>
          <div className="rounded-lg bg-neutral-50 p-4 dark:bg-slate-600">
            <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Average Answer Length
            </h4>
            <p className="text-2xl font-bold text-aurora-600 dark:text-aurora-400">
              {researchSummary.totalAnswers
                ? Math.round(
                    researchSummary.totalWords / researchSummary.totalAnswers,
                  )
                : 0}{" "}
              words
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
