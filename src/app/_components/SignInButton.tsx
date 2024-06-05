"use client";
import { signIn } from "next-auth/react";

interface SignInButtonProps {
  callbackUrl: string;
}

export const SignInButton = ({ callbackUrl }: SignInButtonProps) => (
  <button
    className="rounded-lg bg-blueGray-700 px-6 py-3 text-center text-sm font-medium text-white shadow-md transition duration-300 ease-in-out hover:bg-indigo-700"
    onClick={() => signIn("github", { callbackUrl })}
  >
    Sign in with GitHub
  </button>
);
