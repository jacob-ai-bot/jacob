import React from "react";
import Image from "next/image";
import Link from "next/link";

const Header: React.FC = () => {
  return (
    <div className="flex items-center justify-between bg-white p-4 shadow-sm">
      <Link href="/" className="flex items-center">
        <Image
          src="/images/logo.svg"
          width={120}
          height={60}
          alt="JACoB Logo"
          className="mx-auto"
        />
      </Link>
      <nav>
        <ul className="flex space-x-4">
          <li>
            <Link
              href="https://docs.jacb.ai"
              className="text-coolGray-600 transition-colors hover:text-dark-blue"
            >
              Docs
            </Link>
          </li>
          <li>
            <Link
              href="https://github.com/jacob-ai-bot/jacob"
              className="text-coolGray-600 transition-colors hover:text-dark-blue"
            >
              GitHub
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Header;
