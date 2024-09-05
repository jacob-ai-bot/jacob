import { api } from "~/trpc/server";
import Codebase from "./Codebase";
import { standardizePath } from "~/app/utils";

const DashboardPage = async ({
  params,
}: {
  params: { org: string; repo: string };
}) => {
  const contextItems = await api.codebaseContext.getAll({
    org: params.org,
    repo: params.repo,
  });
  // convert the contextItems taxonomy to a folder structure
  const updatedContextItems = contextItems.map((item) => {
    let taxonomy = (item.taxonomy as string) ?? "";
    taxonomy = standardizePath(taxonomy.replaceAll(" ", "_") ?? "");
    return {
      ...item,
      taxonomy,
    };
  });

  return <Codebase contextItems={updatedContextItems} />;
};

export default DashboardPage;
