import posthog from "posthog-js";
import { env } from "~/env";

const isEnabled =
  env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true" && !!env.NEXT_PUBLIC_POSTHOG_KEY;

if (typeof window !== "undefined" && isEnabled && env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: env.NEXT_PUBLIC_POSTHOG_HOST,
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    disable_session_recording: true,
    persistence: "localStorage",
    disable_cookie: true,
    respect_dnt: true,
    loaded: (posthog) => {
      if (process.env.NODE_ENV === "development") posthog.debug();
    },
  });
}

export { posthog };
