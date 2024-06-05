import { api } from "~/trpc/server";
import Dashboard from "./Dashboard";
import { DEVELOPERS } from "~/data/developers";

const DashboardPage = async ({
  params,
}: {
  params: { org: string; repo: string; developer: string };
}) => {
  const { org, repo, developer } = params;
  const [tasks, project] = await Promise.all([
    api.events.getTasks({
      org,
      repo,
    }),
    api.events.getProject({
      org,
      repo,
    }),
  ]);

  // Create todos from assigned GitHub issues (only for certain developers)
  const selectedDeveloper = DEVELOPERS.find((d) => d.id === developer);
  await api.github.createTodos({
    repo: `${org}/${repo}`,
    mode: selectedDeveloper?.mode,
    projectId: project.id,
  });

  return (
    <Dashboard
      org={org}
      repo={repo}
      developer={developer}
      tasks={tasks}
      project={project}
    />
  );
};

export default DashboardPage;
