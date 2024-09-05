import { api } from "~/trpc/server";
import Codebase from "./Codebase";
import { standardizePath } from "../utils";

const DashboardPage = async () => {
  const contextItems = await api.codebaseContext.getAll({
    projectId: 567,
  });
  // convert the contextItems taxonomy to a folder structure
  const updatedContextItems = contextItems.map((item) => {
    return {
      ...item,
      taxonomy: standardizePath(item.taxonomy?.replaceAll(" ", "_") ?? ""),
    };
  });
  return <Codebase contextItems={updatedContextItems} />;
};

export default DashboardPage;
