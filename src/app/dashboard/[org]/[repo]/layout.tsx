"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "@heroicons/react/24/solid";
import { usePathname } from "next/navigation";

const navItems = [
  "Todo",
  "Chat",
  "Live",
  "Code",
  "Visualize",
  "Front end",
  "Issue writer",
  "Playbooks",
];

export default function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { org: string; repo: string };
}) {
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState(() => {
    const path = pathname?.split("/").pop() ?? "";
    return (
      navItems.find((item) => item.toLowerCase().replace(" ", "-") === path) ??
      "Todo"
    );
  });
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const path = pathname?.split("/").pop() ?? "";
    const newActiveItem =
      navItems.find((item) => item.toLowerCase().replace(" ", "-") === path) ??
      "Todo";
    setActiveItem(newActiveItem);
  }, [pathname]);

  if (!mounted) return null;

  return (
    <div className="flex h-screen w-full border-r border-r-aurora-300 bg-gradient-to-br from-aurora-50 to-blossom-50 text-dark-blue dark:border-r-dark-blue dark:from-slate-900 dark:to-slate-800 dark:text-slate-100">
      {/* Left Sidebar */}
      <motion.aside
        initial={{ x: 0 }}
        animate={{ x: 0 }}
        className="flex w-40 flex-col bg-white shadow-lg dark:bg-slate-800"
      >
        <div className="flex flex-row items-center space-x-2 p-6">
          <Image
            src="/images/logo.png"
            width={30}
            height={30}
            alt="JACoB Logo"
          />
          <h1 className="font-gooper text-2xl font-bold text-aurora-900 dark:text-slate-100">
            JACoB
          </h1>
        </div>

        <nav className="mt-4 flex-grow px-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <motion.li key={item} transition={{ duration: 0.2 }}>
                <Link
                  href={`/dashboard/${params.org}/${params.repo}/${item.toLowerCase().replace(" ", "-")}`}
                  className={`block rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    activeItem === item
                      ? "bg-aurora-50 text-aurora-500 dark:bg-sky-900 dark:text-sky-300"
                      : "text-dark-blue hover:bg-aurora-50 hover:text-aurora-500 dark:text-slate-300 dark:hover:bg-sky-900/50 dark:hover:text-sky-300"
                  }`}
                  onClick={() => setActiveItem(item)}
                >
                  {item}
                </Link>
              </motion.li>
            ))}
          </ul>
        </nav>
        <motion.div className="mb-6 mt-auto px-4" whileHover={{ scale: 1.05 }}>
          <Link
            href={`/dashboard/${params.org}/${params.repo}/settings`}
            className="block rounded-lg bg-sunset-500 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-sunset-600 dark:bg-sky-600/30 dark:hover:bg-sky-500/30 dark:hover:text-sky-300"
          >
            Settings
          </Link>
        </motion.div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white/90 shadow-sm dark:bg-slate-800">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <select className="rounded-full border-none bg-aurora-50 px-4 py-2 pr-8 text-sm text-dark-blue transition-all focus:ring-2 focus:ring-aurora-500 dark:bg-slate-700 dark:text-slate-100 dark:focus:ring-sky-400">
                <option>Select repository</option>
              </select>
              <select className="rounded-full border-none  bg-aurora-50 px-4 py-2 pr-8 text-sm text-dark-blue transition-all focus:ring-2 focus:ring-aurora-500 dark:bg-slate-700 dark:text-slate-100 dark:focus:ring-sky-400">
                <option>Select branch</option>
              </select>
            </div>
            <div className="flex items-center space-x-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="rounded-full bg-aurora-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-aurora-600 dark:bg-sky-600/30 dark:hover:bg-sky-500/30"
              >
                Commit
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="rounded-full bg-blossom-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blossom-600 dark:bg-purple-600/30 dark:hover:bg-purple-500/30"
              >
                New PR
              </motion.button>
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="rounded-full bg-aurora-100 p-2 text-aurora-800 hover:bg-aurora-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              >
                {theme === "dark" ? (
                  <SunIcon className="h-5 w-5" />
                ) : (
                  <MoonIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-gradient-to-br from-aurora-50 to-blossom-50 p-6 dark:from-slate-900 dark:to-slate-800">
          {children}
        </main>
      </div>
    </div>
  );
}
