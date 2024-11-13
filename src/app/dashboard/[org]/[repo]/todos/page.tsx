import { redirect } from "next/navigation";

import Todo from "./Todo";
import { getServerAuthSession } from "~/server/auth";
import { getDashboardUsers } from "~/app/utils";

const dashboardUsers = getDashboardUsers();

const TodoPage = async ({
  params,
}: {
  params: { org: string; repo: string };
}) => {
  const { user } = (await getServerAuthSession()) ?? {};
  if (!user?.login || !dashboardUsers.includes(user.login.toLowerCase())) {
    redirect("/");
  }

  const { org, repo } = params;

  return <Todo org={org} repo={repo} />;
};

export default TodoPage;
