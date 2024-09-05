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
  const sourceMap = await api.github.getSourceMap({
    org: params.org,
    repo: params.repo,
  });
  return (
    <ChatPage
      org={params.org}
      repo={params.repo}
      developerId="otto"
      sourceMap={sourceMap}
    />
  );
};

export default Chat;
