"use client";

import { redirect } from "next/navigation";
import LoadingPage from "./loading";
import { useEffect } from "react";

const DashboardPage = () => {
  useEffect(() => {
    redirect(`/api/dashboard`);
  }, []);
  return <LoadingPage />;
};

export default DashboardPage;
