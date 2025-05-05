import { useEffect } from "react";
import { useRouter } from "next/router";

export default function ZendeskAuthPage() {
  const router = useRouter();

  useEffect(() => {
    const subdomain = process.env.ZENDESK_SUBDOMAIN;
    const clientId = process.env.ZENDESK_CLIENT_ID;
    const redirectUri = `${window.location.origin}/api/auth/zendesk/callback`;
    const scope = "read write"; // Adjust scopes as needed
    const state = process.env.ZENDESK_OAUTH_STATE;

    const zendeskAuthUrl = `https://${subdomain}.zendesk.com/oauth/authorizations/new?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`;

    router.push(zendeskAuthUrl);
  }, [router]);

  return <div>Redirecting to Zendesk for authentication...</div>;
}
