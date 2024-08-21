import { GetStarted } from "./components/GetStarted";
import { getServerAuthSession } from "~/server/auth";
import { redirect } from "next/navigation";

export default async function NewProjectPage() {
  const session = await getServerAuthSession();

  if (session?.user?.login) {
    redirect(`/new/${session.user.login}`);
  }
  return <GetStarted />;
}
