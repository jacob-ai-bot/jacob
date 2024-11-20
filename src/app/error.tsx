"use client";

import Link from "next/link";
import { redirect } from "next/navigation";
import { useEffect } from "react";

export default function Error({ error }: { error: Error & { code: string } }) {
  useEffect(() => {
    console.error(error);
    if (error.message === "Session or user information is missing") {
      redirect("/");
    }
  }, [error]);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-dark-blue">
      <div className="max-w-2xl rounded-lg bg-white/30 px-6 py-8 shadow-md">
        <h1 className="mb-4 text-4xl font-bold text-white">
          Oops! Something went wrong.
        </h1>
        <p className="mb-6 text-lg text-gray-200">
          We apologize for the inconvenience.
        </p>
        <div className="mb-8">
          <p className="text-gray-200">Error details:</p>
          <pre className="mt-2 whitespace-pre-wrap text-sm font-bold text-white">
            {error.message}
          </pre>
        </div>
        <div className="flex w-full justify-center space-x-4">
          <button
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            onClick={handleRefresh}
          >
            Refresh Page
          </button>
          <Link href="/">
            <button className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600">
              Go to Home
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
