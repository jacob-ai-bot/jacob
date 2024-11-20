import Header from "./components/Header";
import { getServerAuthSession } from "~/server/auth";
import { redirect } from "next/navigation";

export default async function NewLoggedInLayout({
  params,
  children,
}: {
  params: { login: string };
  children: React.ReactNode;
}) {
  const session = await getServerAuthSession();
  if (!session?.user?.login) {
    redirect("/setup");
  }
  if (session?.user?.login !== params.login) {
    redirect(`/setup/${session.user.login}`);
  }
  return (
    <div className="hide-scrollbar w-screen overflow-y-scroll text-dark-blue">
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-aurora-50 to-blossom-50 px-4 py-16 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}
