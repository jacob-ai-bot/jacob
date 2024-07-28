import { PostHog } from "posthog-node";

const posthogApiKey = process.env.POSTHOG_API_KEY;

if (!posthogApiKey) {
  console.warn("PostHog API key not found, analytics will be disabled");
}

class DummyPostHogClient {
  capture() {}
}

export const posthogClient = posthogApiKey
  ? new PostHog(posthogApiKey, { host: "https://app.posthog.com" })
  : new DummyPostHogClient();
