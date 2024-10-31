import { JiraOAuth } from "~/routes/JiraOAuth";
import { env } from "~/env";

export default function JiraOAuthPage() {
  const redirectURI = `${env.NEXTAUTH_URL}/api/auth/jira/callback`;
  return <JiraOAuth redirectURI={redirectURI} />;
}
