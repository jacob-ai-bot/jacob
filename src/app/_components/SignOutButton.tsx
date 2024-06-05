"use client";
import { signOut } from "next-auth/react";

interface SignOutButtonProps {
  callbackUrl?: string;
}

export const SignOutButton = ({ callbackUrl }: SignOutButtonProps) => (
  <button
    className="rounded-lg bg-blueGray-700 px-6 py-3 text-center text-sm font-medium text-white shadow-md transition duration-300 ease-in-out hover:bg-indigo-700"
    onClick={() => signOut({ callbackUrl })}
  >
    Sign out
  </button>
);
