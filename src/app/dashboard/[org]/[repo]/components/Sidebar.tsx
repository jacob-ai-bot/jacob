"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faListCheck,
  faComments,
  faCode,
  faPaintBrush,
  faCog,
  faPencil,
  faRobot,
  faBars,
  faHome,
} from "@fortawesome/free-solid-svg-icons";
import { debounce } from "lodash";
import { usePathname } from "next/navigation";

const navItems = [
  { name: "Overview", icon: faHome },
  { name: "Code Visualizer", icon: faCode },
  { name: "Issue Writer", icon: faPencil },
  { name: "Todos", icon: faListCheck },
  { name: "Assigned Tasks", icon: faRobot },
  { name: "Chat", icon: faComments },
  { name: "Design", icon: faPaintBrush },
];

export default function Sidebar({ org, repo }: { org: string; repo: string }) {
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState(() => {
    const path = pathname?.split("/").pop() ?? "";
    return (
      navItems.find(
        (item) => item.name.toLowerCase().replace(" ", "-") === path,
      )?.name ?? "Overview"
    );
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const debounceExpandRef = useRef<ReturnType<typeof debounce>>();
  const debounceCollapseRef = useRef<ReturnType<typeof debounce>>();

  useEffect(() => {
    debounceExpandRef.current = debounce((value: boolean) => {
      setIsExpanded(value);
    }, 500);

    debounceCollapseRef.current = debounce((value: boolean) => {
      setIsExpanded(value);
    }, 0);

    return () => {
      debounceExpandRef.current?.cancel();
      debounceCollapseRef.current?.cancel();
    };
  }, []);

  const handleMouseEnter = useCallback(() => {
    debounceCollapseRef.current?.cancel();
    debounceExpandRef.current?.(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    debounceExpandRef.current?.cancel();
    if (isExpanded) {
      debounceCollapseRef.current?.(false);
    }
  }, [isExpanded]);

  useEffect(() => {
    const path = pathname?.split("/").pop() ?? "";
    const newActiveItem =
      navItems.find(
        (item) => item.name.toLowerCase().replace(" ", "-") === path,
      )?.name ?? "Overview";
    setActiveItem(newActiveItem);
  }, [pathname]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  return (
    <>
      <motion.aside
        initial={{ width: "72px" }}
        animate={{ width: isExpanded ? "250px" : "72px" }}
        onHoverStart={handleMouseEnter}
        onHoverEnd={handleMouseLeave}
        transition={{ duration: isExpanded ? 0.3 : 0.2 }}
        className="absolute z-50 hidden h-screen flex-col border-r-0 border-r-aurora-200/80 bg-white/90 dark:border-r-0 dark:bg-slate-800/90 md:flex"
      >
        <div
          className={`justify-left ml-4 flex h-16 items-center bg-white pt-1.5 font-gooper dark:bg-slate-800`}
        >
          <Image
            src="/images/logo.png"
            width={34}
            height={34}
            alt="JACoB Logo"
          />
          {isExpanded && (
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="ml-2 font-gooper text-2xl font-bold text-aurora-900 dark:text-slate-100"
            >
              JACoB
            </motion.h1>
          )}
        </div>

        <nav className="mt-4 flex-grow px-2">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <motion.li key={item.name} transition={{ duration: 0.2 }}>
                <Link
                  href={`/dashboard/${org}/${repo}/${item.name.toLowerCase().replace(" ", "-")}`}
                  className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    activeItem === item.name
                      ? "hover:bg-aurora-white bg-aurora-50 text-aurora-500 hover:text-aurora-500 dark:bg-sky-900 dark:text-sky-300"
                      : "text-dark-blue hover:bg-aurora-50 hover:text-aurora-500 dark:text-slate-300 dark:hover:bg-sky-900/50 dark:hover:text-sky-300"
                  }`}
                  onClick={() => setActiveItem(item.name)}
                >
                  <FontAwesomeIcon
                    icon={item.icon}
                    className={`ml-[6px] h-5 w-5`}
                  />
                  {isExpanded && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className="ml-3 text-nowrap"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </Link>
              </motion.li>
            ))}
          </ul>
        </nav>
        <motion.div className="mb-6 mt-auto space-y-2 px-2">
          <Link
            href={`/dashboard/${org}/${repo}/settings`}
            className={`flex items-center justify-center rounded-lg bg-sunset-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-sunset-600 hover:text-white dark:bg-sunset-600/30 dark:hover:bg-sunset-500/30`}
          >
            <FontAwesomeIcon icon={faCog} className="h-5 w-5" />
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="ml-3"
              >
                Settings
              </motion.span>
            )}
          </Link>
        </motion.div>
      </motion.aside>
      <div className="absolute items-start md:hidden">
        <button
          onClick={toggleMobileMenu}
          className="p-4 text-2xl text-dark-blue dark:text-slate-100"
        >
          <FontAwesomeIcon icon={faBars} />
        </button>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-800"
          >
            <button
              onClick={toggleMobileMenu}
              className="self-end p-4 text-2xl text-dark-blue dark:text-slate-100"
            >
              <FontAwesomeIcon icon={faBars} />
            </button>
            <nav className="mt-4 flex-grow px-2">
              <ul className="space-y-2">
                {navItems.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={`/dashboard/${org}/${repo}/${item.name.toLowerCase().replace(" ", "-")}`}
                      className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                        activeItem === item.name
                          ? "hover:bg-aurora-white bg-aurora-50 text-aurora-500 hover:text-aurora-500 dark:bg-sky-900 dark:text-sky-300"
                          : "text-dark-blue hover:bg-aurora-50 hover:text-aurora-500 dark:text-slate-300 dark:hover:bg-sky-900/50 dark:hover:text-sky-300"
                      }`}
                      onClick={() => {
                        setActiveItem(item.name);
                        toggleMobileMenu();
                      }}
                    >
                      <FontAwesomeIcon
                        icon={item.icon}
                        className={`ml-[6px] h-5 w-5`}
                      />
                      <span className="ml-3 text-nowrap">{item.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </motion.div>
        )}
      </div>
    </>
  );
}
