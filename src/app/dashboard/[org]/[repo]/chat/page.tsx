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
  const project = await api.events.getProject({
    org: params.org,
    repo: params.repo,
  });
  return <ChatPage org={params.org} repo={params.repo} project={project} />;
};

export default Chat;
