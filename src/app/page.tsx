import Image from "next/image";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";

import { getServerAuthSession } from "~/server/auth";
import { SignInButton } from "~/app/_components/SignInButton";
import { SignOutButton } from "~/app/_components/SignOutButton";

export default async function Home() {
  const session = await getServerAuthSession();

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-aurora-50 to-blossom-50 p-4">
      <div className="flex w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="flex">
          <div className="w-1/2 p-12">
            <Image
              src="/images/logo.svg"
              width={160}
              height={160}
              alt="JACoB Logo"
              className="mb-8"
            />
            <h1 className="mb-4 font-crimson text-5xl font-bold tracking-tight text-aurora-900">
              Welcome to JACoB
            </h1>
            <p className="mb-8 text-lg text-aurora-700">
              Shaping the future of AI-assisted development.
            </p>

            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Link
                className="flex flex-col gap-2 rounded-xl bg-dark-beige p-4 transition-colors hover:bg-dark-beige/70"
                href="https://jacb.ai"
                target="_blank"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-aurora-800">
                    JACoB Website
                  </h3>
                  <FontAwesomeIcon
                    icon={faArrowRight}
                    className="h-6 w-6 text-blossom-600"
                  />
                </div>
                <div className="text-aurora-600">An overview of JACoB.</div>
              </Link>
              <Link
                className="flex flex-col gap-2 rounded-xl bg-dark-beige p-4 transition-colors hover:bg-dark-beige/70"
                href="/setup"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-aurora-800">
                    Get Started
                  </h3>
                  <FontAwesomeIcon
                    icon={faArrowRight}
                    className=" h-6 w-6 text-blossom-600"
                  />
                </div>
                <div className="text-aurora-600">
                  Set up your first project.
                </div>
              </Link>
            </div>

            <div className="flex flex-col items-start gap-4">
              {session ? (
                <>
                  <p className="text-lg text-aurora-700">
                    Logged in as{" "}
                    <span className="font-semibold">{session.user?.name}</span>
                  </p>
                  <SignOutButton />
                </>
              ) : (
                <SignInButton callbackUrl="/" />
              )}
            </div>
          </div>

          <div className="relative w-1/2 overflow-hidden bg-gradient-to-br from-aurora-100 to-blossom-100 p-12">
            <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-aurora-200 opacity-50"></div>
            <div className="absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-blossom-200 opacity-50"></div>

            <Image
              src="/images/image1.png"
              width={200}
              height={150}
              alt="JACoB in action"
              className="absolute right-8 top-8 rotate-3 transform rounded-lg shadow-md"
            />
            <Image
              src="/images/image2.png"
              width={200}
              height={150}
              alt="JACoB features"
              className="absolute bottom-8 left-8 -rotate-3 transform rounded-lg shadow-md"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
