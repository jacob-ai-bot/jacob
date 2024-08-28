import { getServerAuthSession } from "~/server/auth";
import { redirect } from "next/navigation";

export default async function Success() {
  const session = await getServerAuthSession();

  if (session?.user?.login) {
    redirect(`/setup/${session.user.login}`);
  }
  return redirect("/setup");
}
