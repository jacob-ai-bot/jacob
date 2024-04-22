import "~/styles/globals.css";

import { Poppins } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";

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
      <body className={`bg-[#1d265d] text-white h-screen w-screen leading-relaxed text-center font-sans ${poppins.variable}`}>
        <TRPCReactProvider>
          {children}
        </TRPCReactProvider>
      </body>
    </html>
  );
}
