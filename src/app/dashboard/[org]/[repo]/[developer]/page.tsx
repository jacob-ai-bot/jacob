import { api } from "~/trpc/server";
import Dashboard from "./Dashboard";

const DashboardPage = async ({
  params,
}: {
  params: { org: string; repo: string; developer: string };
}) => {
  const { org, repo, developer } = params;
  const [tasks, project, sourceMap] = await Promise.all([
    api.events.getTasks({
      org,
      repo,
    }),
    api.events.getProject({
      org,
      repo,
    }),
    api.github.getSourceMap({
      org,
      repo,
    }),
  ]);

  return (
    <Dashboard
      org={org}
      repo={repo}
      developerId={developer}
      tasks={tasks}
      project={project}
      sourceMap={sourceMap}
    />
  );
};

export default DashboardPage;
