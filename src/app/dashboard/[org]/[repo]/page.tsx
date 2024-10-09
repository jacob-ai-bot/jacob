"use client";

import { redirect } from "next/navigation";
import LoadingPage from "../../loading";
import { useEffect } from "react";

const RepoPage = ({ params }: { params: { org: string; repo: string } }) => {
  const { org, repo } = params;
  useEffect(() => {
    redirect(`/api/dashboard?org=${org}&repo=${repo}`);
  }, [org, repo]);
  return <LoadingPage />;
};

export default RepoPage;
