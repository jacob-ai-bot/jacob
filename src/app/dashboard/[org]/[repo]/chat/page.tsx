import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import ChatPage from "./ChatPage";

const dashboardUsers = (process.env.DASHBOARD_USERS ?? "")
  .toLowerCase()
  .split(",");

const Chat = async ({ params }: { params: { org: string; repo: string } }) => {
  const { user } = (await getServerAuthSession()) ?? {};
  if (!user?.login || !dashboardUsers.includes(user.login.toLowerCase())) {
    redirect("/");
  }
  const { org, repo } = params;

  return <ChatPage org={org} repo={repo} />;
};

export default Chat;
