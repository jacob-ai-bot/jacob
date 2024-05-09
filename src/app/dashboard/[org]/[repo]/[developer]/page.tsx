import Dashboard from "./Dashboard";

const DashboardPage = async ({
  params,
}: {
  params: { org: string; repo: string; developer: string };
}) => {
  const { org, repo, developer } = params;

  return <Dashboard org={org} repo={repo} developer={developer} />;
};

export default DashboardPage;
