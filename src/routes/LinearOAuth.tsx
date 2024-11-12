"use client";

import { useSearchParams } from "next/navigation";
import React from "react";
import { env } from "~/env";

interface LinearOAuthProps {
  redirectURI: string;
}

export function LinearOAuth({ redirectURI }: LinearOAuthProps) {
  const searchParams = useSearchParams();
  const projectId = searchParams?.get("projectId");
  React.useEffect(() => {
    const state = `linear-${Math.random().toString(36).substring(2, 15)}-${projectId}`;
    localStorage.setItem("linearOAuthState", state);

    const authUrl = new URL("https://linear.app/oauth/authorize");
    authUrl.searchParams.append("client_id", env.NEXT_PUBLIC_LINEAR_CLIENT_ID);
    authUrl.searchParams.append("redirect_uri", redirectURI);
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("state", state);
    authUrl.searchParams.append("scope", "read,write");

    window.location.href = authUrl.toString();
  }, [redirectURI]);

  return <div>Redirecting to Linear for authentication...</div>;
}
