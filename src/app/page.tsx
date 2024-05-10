import Link from "next/link";

import { getServerAuthSession } from "~/server/auth";
import { Logo } from "~/images/Logo";

export default async function Home() {
  const session = await getServerAuthSession();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f8e8e0] text-[#1d265d]">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          <Logo className="h-[100px] w-auto" />
        </h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
          <Link
            className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/40 p-4 hover:bg-white/70"
            href="https://jacb.ai"
            target="_blank"
          >
            <h3 className="text-2xl font-bold">JACoB Website →</h3>
            <div className="text-lg">An overview of JACoB.</div>
          </Link>
          <Link
            className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/40 p-4 hover:bg-white/70"
            href="https://docs.jacb.ai"
            target="_blank"
          >
            <h3 className="text-2xl font-bold">Documentation →</h3>
            <div className="text-lg">
              Learn more about how to use JACoB in your projects.
            </div>
          </Link>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="flex flex-col items-center justify-center gap-4">
            <p className="text-center text-2xl">
              {session && <span>Logged in as {session.user?.name}</span>}
            </p>
            <Link
              href={session ? "/api/auth/signout" : "/api/auth/signin"}
              className="rounded-full bg-white/40 px-10 py-3 font-semibold no-underline transition hover:bg-white/70"
            >
              {session ? "Sign out" : "Sign in"}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
