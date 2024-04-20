import { Suspense } from "react";
import { GitHubOAuth } from "~/routes/GitHubOAuth";

export default function GitHubOAuthPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GitHubOAuth redirectURI={`${process.env.NEXTAUTH_URL}/auth/github`} />
    </Suspense>
  );
}
