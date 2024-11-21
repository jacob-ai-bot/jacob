import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import ChatPage from "./ChatPage";
import { Suspense } from "react";

const Chat = async ({ params }: { params: { org: string; repo: string } }) => {
  const { user } = (await getServerAuthSession()) ?? {};
  if (!user?.login || !user.dashboardEnabled) {
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
