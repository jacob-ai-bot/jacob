"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error }: { error: Error }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center ">
      <div className="max-w-2xl rounded-lg bg-white/10 px-6 py-8 shadow-md">
        <h1 className="mb-4 text-4xl font-bold">Oops! Something went wrong.</h1>
        <p className="mb-6 text-lg text-gray-200">
          We apologize for the inconvenience.
        </p>
        <div className="mb-8">
          <p className="text-white">Error details:</p>
          <pre className="mt-2 text-sm text-red-500">{error.message}</pre>
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
