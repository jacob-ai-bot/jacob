import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import ChatPage from "./ChatPage";
import { Suspense } from "react";
import { getDashboardUsers } from "~/app/utils";

const dashboardUsers = getDashboardUsers();

const Chat = async ({ params }: { params: { org: string; repo: string } }) => {
  const { user } = (await getServerAuthSession()) ?? {};
  if (!user?.login || !dashboardUsers.includes(user.login.toLowerCase())) {
    redirect("/");
  }
  const { org, repo } = params;

  return (
    <Suspense>
      <ChatPage org={org} repo={repo} />
    </Suspense>
  );
};

export default Chat;
