import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import ChatPage from "./ChatPage";
import { api } from "~/trpc/server";

const dashboardUsers = (process.env.DASHBOARD_USERS ?? "")
  .toLowerCase()
  .split(",");

const Chat = async ({ params }: { params: { org: string; repo: string } }) => {
  const { user } = (await getServerAuthSession()) ?? {};
  if (!user?.login || !dashboardUsers.includes(user.login.toLowerCase())) {
    redirect("/");
  }
  const { org, repo } = params;
  const [project, contextItems] = await Promise.all([
    api.events.getProject({
      org,
      repo,
    }),
    api.codebaseContext.getAll({
      org,
      repo,
    }),
  ]);
  return (
    <ChatPage
      project={project}
      contextItems={contextItems}
      org={org}
      repo={repo}
    />
  );
};

export default Chat;
