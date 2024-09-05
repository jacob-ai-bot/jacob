import { api } from "~/trpc/server";
import Codebase from "./Codebase";

const DashboardPage = async ({
  params,
}: {
  params: { org: string; repo: string };
}) => {
  const contextItems = await api.codebaseContext.getAll({
    org: params.org,
    repo: params.repo,
  });
  return <Codebase contextItems={contextItems} />;
};

export default DashboardPage;
