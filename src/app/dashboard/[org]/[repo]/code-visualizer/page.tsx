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
    const taxonomy = standardizePath(item.taxonomy!.replaceAll(" ", "_"));
    return {
      ...item,
      taxonomy,
    };
  });

  return (
    <Codebase
      contextItems={updatedContextItems}
      org={params.org}
      repo={params.repo}
    />
  );
};

export default DashboardPage;
