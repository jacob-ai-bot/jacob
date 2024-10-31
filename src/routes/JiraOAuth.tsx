import { useEffect, useState } from "react";
import { useRouter } from "next/router";

interface JiraOAuthProps {
  redirectURI: string;
}

export function JiraOAuth({ redirectURI }: JiraOAuthProps) {
  const router = useRouter();
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initiateOAuth = () => {
      const state = Math.random().toString(36).substring(7);
      sessionStorage.setItem("jiraOAuthState", state);

      const authUrl = new URL("https://auth.atlassian.com/authorize");
      authUrl.searchParams.append("audience", "api.atlassian.com");
      authUrl.searchParams.append(
        "client_id",
        process.env.NEXT_PUBLIC_JIRA_CLIENT_ID!,
      );
      authUrl.searchParams.append("scope", "read:jira-work");
      authUrl.searchParams.append("redirect_uri", redirectURI);
      authUrl.searchParams.append("state", state);
      authUrl.searchParams.append("response_type", "code");
      authUrl.searchParams.append("prompt", "consent");

      window.location.href = authUrl.toString();
    };

    const code = router.query.code as string;
    const state = router.query.state as string;

    if (code && state) {
      const storedState = sessionStorage.getItem("jiraOAuthState");
      if (state !== storedState) {
        setError(new Error("Invalid state parameter"));
        return;
      }

      const exchangeCodeForToken = async () => {
        try {
          const response = await fetch("/api/auth/jira/callback", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            throw new Error("Failed to exchange code for token");
          }

          router.push("/dashboard");
        } catch (error) {
          setError(error as Error);
        }
      };

      exchangeCodeForToken();
    } else {
      initiateOAuth();
    }
  }, [router, redirectURI]);

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return <div>Connecting to Jira...</div>;
}
