"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";

export default function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { org: string; repo: string };
}) {
  const router = useRouter();

  // This is used to redirect the user to the sign-in page if the session expires
  useEffect(() => {
    const getExpiresIn = async () => {
      const res = await fetch("/api/auth/expires");
      const data = (await res.json()) as { expires_in: number };
      const expiresIn = data.expires_in; // in milliseconds

      if (expiresIn <= 0) {
        router.push("/");
      } else {
        // Set a timeout to redirect when the session expires
        console.log("setting timeout", expiresIn);
        const timeoutId = setTimeout(() => {
          router.push("/");
        }, expiresIn);

        return () => {
          console.log("clearing timeout", timeoutId);
          clearTimeout(timeoutId);
        };
      }
    };
    void getExpiresIn();
  }, [router]);

  return (
    <div className="flex h-screen w-full border-r border-r-aurora-300 bg-gradient-to-br from-aurora-50 to-blossom-50 text-dark-blue dark:border-r-dark-blue dark:from-slate-900 dark:to-slate-800 dark:text-slate-100">
      <Sidebar org={params.org} repo={params.repo} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header org={params.org} repoName={params.repo} />
        <main className="hide-scrollbar flex-1 overflow-auto bg-gradient-to-br from-aurora-50 to-blossom-50 p-6 pl-[96px] dark:from-slate-900 dark:to-slate-800">
          {children}
        </main>
      </div>
    </div>
  );
}
