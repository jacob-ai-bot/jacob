import { redirect } from "next/navigation";

import Todo from "./Todo";
import { getServerAuthSession } from "~/server/auth";

const TodoPage = async ({
  params,
}: {
  params: { org: string; repo: string };
}) => {
  const { user } = (await getServerAuthSession()) ?? {};
  if (!user?.login || !user.dashboardEnabled) {
    redirect("/");
  }

  const { org, repo } = params;

  return <Todo org={org} repo={repo} />;
};

export default TodoPage;
