"use client";

import Image from "next/image";
import Link from "next/link";
import { SignInButton } from "~/app/_components/SignInButton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";

export const GetStarted: React.FC = () => {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-aurora-50 to-blossom-50 p-4">
      <div className="flex w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="w-1/2 p-12">
          <Image
            src="/images/logo.svg"
            width={160}
            height={160}
            alt="JACoB Logo"
            className="mb-8"
          />
          <h1 className="mb-4 font-crimson text-5xl font-bold tracking-tight text-aurora-900">
            Let&apos;s Get Started
          </h1>
          <p className="mb-8 text-lg text-aurora-700">
            Join the community shaping the future of AI-assisted development.
          </p>

          <div className="mb-8">
            <p className="-m-4 mb-4 rounded-md bg-gray-50 p-4 text-sm text-aurora-600">
              JACoB creates pull requests directly on GitHub, requiring specific
              permissions. For privacy, you can self-host JACoB using our
              open-source code.
            </p>
            <Link
              href="https://github.com/jacob-ai-bot/jacob"
              className="inline-flex items-center text-blossom-600 hover:text-blossom-700"
            >
              Explore our GitHub repo
              <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
            </Link>
          </div>

          <SignInButton callbackUrl={`/new/success`} />
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
  );
};
