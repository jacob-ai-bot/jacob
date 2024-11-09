"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { env } from "~/env";

export default function LinearOAuth() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const projectId = searchParams.get("projectId");
    if (!projectId) {
      console.error("Missing projectId");
      return;
    }

    const state = projectId;
    const scope = "read write issues:create";

    const authUrl = new URL("https://linear.app/oauth/authorize");
    authUrl.searchParams.append("client_id", env.NEXT_PUBLIC_LINEAR_CLIENT_ID);
    authUrl.searchParams.append(
      "redirect_uri",
      `${env.NEXT_PUBLIC_NEXTAUTH_URL}/api/auth/linear/callback`,
    );
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("state", state);
    authUrl.searchParams.append("scope", scope);

    router.push(authUrl.toString());
  }, [router, searchParams]);

  return <div>Redirecting to Linear for authentication...</div>;
}
