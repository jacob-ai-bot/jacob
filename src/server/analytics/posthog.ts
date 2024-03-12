import { PostHog } from "posthog-node";

const posthogApiKey = process.env.POSTHOG_API_KEY;

if (!posthogApiKey) {
  throw new Error("Missing PostHog API key");
}

export const posthogClient = new PostHog(posthogApiKey, {
  host: "https://app.posthog.com",
});
