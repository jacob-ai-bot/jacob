import posthog from "posthog-js";
import { env } from "~/env";

if (typeof window !== "undefined") {
  posthog.init(env.NEXT_PUBLIC_POSTHOG_API_KEY, {
    api_host: "https://app.posthog.com",
    loaded: (posthog) => {
      if (process.env.NODE_ENV === "development") posthog.debug();
    },
    capture_pageview: true,
    persistence: "localStorage",
    disable_session_recording: true,
    disable_persistence: false,
  });
}

export default posthog;
