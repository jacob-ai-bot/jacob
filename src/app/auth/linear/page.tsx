import { LinearOAuth } from "~/routes/LinearOAuth";
import { env } from "~/env";
import { Suspense } from "react";

export default function LinearOAuthPage() {
  const redirectURI = `${env.NEXTAUTH_URL}/api/auth/linear/callback`;

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LinearOAuth redirectURI={redirectURI} />
    </Suspense>
  );
}
