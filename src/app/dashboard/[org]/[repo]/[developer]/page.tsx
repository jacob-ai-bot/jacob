import { api } from "~/trpc/server";
import Dashboard from "./Dashboard";

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
