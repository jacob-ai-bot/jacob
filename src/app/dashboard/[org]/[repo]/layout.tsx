"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import { api } from "~/trpc/react";

export default function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { org: string; repo: string };
}) {
  const router = useRouter();
  const { org, repo } = params;
  const [selectedBranch, setSelectedBranch] = useState<string>("main");

  // This is used to redirect the user to the sign-in page if the session expires
  useEffect(() => {
    const getExpiresIn = async () => {
      try {
        const res = await fetch("/api/auth/expires");
        const data = (await res.json()) as { expires_in: number };
        const expiresIn = data.expires_in; // in milliseconds

        if (expiresIn <= 0) {
          await fetch("/api/auth/accessToken/refresh");
          router.push("/");
        } else {
          // Set a timeout to redirect when the session expires
          console.log("setting timeout", expiresIn);
          const timeoutId = setTimeout(() => {
            void fetch("/api/auth/accessToken/refresh").then(() => {
              router.push("/");
            });
          }, expiresIn);

          return () => {
            console.log("clearing timeout", timeoutId);
            clearTimeout(timeoutId);
          };
        }
      } catch (error) {
        console.error("Error getting expires in", error);
        // redirect to the sign-in page
        router.push("/");
      }
    };
    void getExpiresIn();
  }, [router]);

  const { data: branches, isLoading: isLoadingBranches } =
    api.github.getBranches.useQuery({ org, repo });

  const { data: repos, isLoading: isLoadingRepos } =
    api.github.getRepos.useQuery();

  useEffect(() => {
    const savedBranch = localStorage.getItem(`selectedBranch-${org}-${repo}`);
    if (savedBranch) {
      setSelectedBranch(savedBranch);
    } else if (branches && branches.length > 0) {
      setSelectedBranch(branches[0]);
      localStorage.setItem(`selectedBranch-${org}-${repo}`, branches[0]);
    }
  }, [org, repo, branches]);

  return (
    <div className="flex h-screen w-full border-r border-r-aurora-300 bg-gradient-to-br from-aurora-50 to-blossom-50 text-dark-blue dark:border-r-dark-blue dark:from-slate-900 dark:to-slate-800 dark:text-slate-100">
      <Sidebar org={org} repo={repo} />
      <div className="flex flex-1 flex-col overflow-hidden pt-14 md:pt-0">
        <Header
          org={org}
          repoName={repo}
          branches={branches}
          isLoadingBranches={isLoadingBranches}
          repos={repos}
          isLoadingRepos={isLoadingRepos}
          selectedBranch={selectedBranch}
          setSelectedBranch={setSelectedBranch}
        />
        <main className="hide-scrollbar flex-1 overflow-auto bg-gradient-to-br from-aurora-50 to-blossom-50 p-1 pl-1 dark:from-slate-900 dark:to-slate-800 md:p-6 md:pl-[96px]">
          {children}
        </main>
      </div>
    </div>
  );
}
