import { redirect } from "next/navigation";

import { getServerAuthSession } from "~/server/auth";
import { SignInButton } from "~/app/_components/SignInButton";

type Props = {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function SignIn({ searchParams }: Props) {
  const session = await getServerAuthSession();

  if (session) {
    redirect("/");
  }

  const callbackUrl =
    typeof searchParams.callbackUrl === "string"
      ? searchParams.callbackUrl
      : "/";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f8e8e0] text-[#1d265d]">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          <img src="/images/logo.svg" className="h-[100px] w-auto" alt="logo" />
        </h1>
        <div>{!session && <SignInButton callbackUrl={callbackUrl} />}</div>
      </div>
    </main>
  );
}
