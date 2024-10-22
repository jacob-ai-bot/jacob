"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { signIn } from "next-auth/react";

export default function AuthError() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  useEffect(() => {
    console.log("error", error);
    if (error === "OAuthAccountNotLinked") {
      // Clear any existing sessions
      localStorage.clear();
      sessionStorage.clear();

      // Redirect to sign in
      signIn("github", {
        callbackUrl: "/",
        scope: "read:user read:org repo admin:org",
      });
    }
  }, [error, router]);

  const handleSignIn = () => {
    signIn("github", {
      callbackUrl: "/",
      scope: "read:user read:org repo admin:org",
    });
  };

  return (
    <div>
      <h1>Authentication Error</h1>
      <p>Redirecting to sign in...</p>
      <button onClick={handleSignIn}>Sign In</button>
    </div>
  );
}
