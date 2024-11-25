"use client";
import { PostHogProvider } from "posthog-js/react";
import { type ReactNode } from "react";
import { posthog } from "~/utils/posthog";

interface PostHogClientProviderProps {
  children: ReactNode;
}

const PostHogClientProvider: React.FC<PostHogClientProviderProps> = ({
  children,
}) => {
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
};

export default PostHogClientProvider;
