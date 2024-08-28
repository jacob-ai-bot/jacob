"use client";

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCode } from "@fortawesome/free-solid-svg-icons";

const Loading = () => {
  return (
    <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl bg-gradient-to-br from-white to-indigo-50/50 shadow-xl">
      <div className="rounded-t-3xl border border-aurora-100 bg-aurora-50 p-8">
        <h1 className="mb-2 font-crimson text-4xl font-bold tracking-tight text-aurora-900">
          Indexing your codebase
        </h1>
        <p className="text-xl text-aurora-700">
          This may take a few moments. We&apos;re creating your project
          configuration...
        </p>
        <div className="mt-6 flex flex-row items-center justify-center  space-x-2">
          <div className="h-8 w-8 animate-bounce rounded-full bg-aurora-500 [animation-delay:-0.3s]"></div>
          <div className="h-8 w-8 animate-bounce rounded-full bg-blossom-500 [animation-delay:-0.15s]"></div>
          <div className="h-8 w-8 animate-bounce rounded-full bg-sunset-500"></div>
        </div>
      </div>
    </div>
  );
};

export default Loading;
