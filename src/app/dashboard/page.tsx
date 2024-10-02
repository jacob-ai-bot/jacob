"use client";

import { redirect } from "next/navigation";
import LoadingPage from "./loading";
import { useEffect } from "react";

const DashbordPage = () => {
  useEffect(() => {
    redirect(`/api/dashboard`);
  }, []);
  return <LoadingPage />;
};

export default DashbordPage;
