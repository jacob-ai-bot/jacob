"use client";

import { api } from "~/trpc/react";

export function Repos() {
  const { data } = api.github.getRepos.useQuery();
  return (
    <div>
      <h1>Repos</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
