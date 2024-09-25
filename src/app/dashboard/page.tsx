"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FlickeringGrid from "../_components/magicui/flickering-grid";
import LoadingPage from "./loading";

const DashboardPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const performRedirect = async () => {
      try {
        const response = await fetch("/api/dashboard/redirect", {
          method: "GET",
          credentials: "include", // Include cookies in the request
        });

        if (!response.ok) {
          // Handle error response
          console.error("Failed to fetch redirect URL");
          setLoading(false);
          return;
        }

        const data = await response.json();

        if (data.redirectTo) {
          const decodedUrl = decodeURIComponent(data.redirectTo as string);
          router.replace(decodedUrl);
        } else {
          console.error("No redirect URL provided");
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching redirect URL", error);
        setLoading(false);
      }
    };

    void performRedirect();
  }, [router]);

  if (loading) {
    return <LoadingPage />;
  }

  // Optionally, display an error message or fallback UI if not loading
  return null;
};

export default DashboardPage;
