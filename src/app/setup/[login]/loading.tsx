"use client";

import React from "react";

const Loading = () => {
  return (
    <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl bg-gradient-to-br from-white to-indigo-50/50 shadow-xl">
      <div className="rounded-t-3xl border border-aurora-100 bg-aurora-50 p-8">
        <h1 className="mb-2 font-crimson text-4xl font-bold tracking-tight text-aurora-900">
          Indexing your codebase
        </h1>
        <p className="text-xl text-aurora-700">
          JACoB works in a similar way to a CI system. To optimize the code
          creation process, JACoB will run builds to ensure the code is working
          properly. To speed up this process, we&apos;re reviewing your code and
          creating a first draft of your project configuration...
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
