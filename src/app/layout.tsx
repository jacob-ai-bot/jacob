import { ThemeProvider } from "next-themes";

import "~/styles/globals.css";
import "~/index.css";

import { TRPCReactProvider } from "~/trpc/react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "react-complex-tree/lib/style-modern.css";
import { PostHogProvider } from "posthog-js/react";
import posthog from "~/utils/posthog";

export const metadata = {
  title: "JACoB",
  description: "JACoB: Just Another Coding Bot",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`h-screen w-screen bg-gradient-to-br from-aurora-50 to-blossom-50 text-dark-blue dark:from-slate-900 dark:to-slate-800 dark:text-slate-100`}
      >
        <PostHogProvider client={posthog}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <TRPCReactProvider>{children}</TRPCReactProvider>
            <ToastContainer />
          </ThemeProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
