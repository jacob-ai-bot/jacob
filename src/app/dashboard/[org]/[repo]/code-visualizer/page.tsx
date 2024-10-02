import Codebase from "./Codebase";

const DashboardPage = async ({
  params,
}: {
  params: { org: string; repo: string };
}) => {
  return <Codebase org={params.org} repo={params.repo} />;
};

export default DashboardPage;
