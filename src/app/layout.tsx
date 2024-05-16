import "~/styles/globals.css";

import { Poppins } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-sans",
});

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
      <body
        className={`h-screen w-screen bg-[#1d265d] text-center font-sans leading-relaxed text-white ${poppins.variable}`}
      >
        <TRPCReactProvider>{children}</TRPCReactProvider>
        <ToastContainer />
      </body>
    </html>
  );
}
