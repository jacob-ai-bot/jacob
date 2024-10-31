import { JiraOAuth } from "~/routes/JiraOAuth";
import { env } from "~/env";
import { Suspense } from "react";

export default function JiraOAuthPage() {
  const redirectURI = `${env.NEXTAUTH_URL}/api/auth/jira/callback`;

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <JiraOAuth redirectURI={redirectURI} />
    </Suspense>
  );
}
