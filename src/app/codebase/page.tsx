import { api } from "~/trpc/server";
import Codebase from "./Codebase";

const DashboardPage = async () => {
  const contextItems = await api.codebaseContext.getAll({
    projectId: 567,
  });
  return <Codebase contextItems={contextItems} />;
};

export default DashboardPage;
