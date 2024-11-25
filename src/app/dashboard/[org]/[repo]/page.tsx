"use client";

import { redirect } from "next/navigation";
import LoadingPage from "../../loading";
import { useEffect } from "react";

const RepoPage = ({ params }: { params: { org: string; repo: string } }) => {
  const { org, repo } = params;
  useEffect(() => {
    redirect(`/dashboard/${org}/${repo}/overview`);
  }, [org, repo]);
  return <LoadingPage />;
};

export default RepoPage;
