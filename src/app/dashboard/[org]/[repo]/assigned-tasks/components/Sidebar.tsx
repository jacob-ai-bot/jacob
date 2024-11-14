import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCode,
  faPaintBrush,
  faTerminal,
  faCommentDots,
  faBug,
  faCodeBranch,
} from "@fortawesome/free-solid-svg-icons";
import { SidebarIcon } from "~/types";

interface SidebarProps {
  selectedIcon: SidebarIcon;
  onIconClick: (icon: SidebarIcon) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ selectedIcon, onIconClick }) => {
  const icons = [
    { icon: faCode, name: SidebarIcon.Code, label: "Code" },
    { icon: faTerminal, name: SidebarIcon.Terminal, label: "Terminal" },
    { icon: faBug, name: SidebarIcon.Issues, label: "Issues" },
    {
      icon: faCodeBranch,
      name: SidebarIcon.PullRequests,
      label: "PR",
    },
    { icon: faPaintBrush, name: SidebarIcon.Design, label: "Design" },
    { icon: faCommentDots, name: SidebarIcon.Prompts, label: "Prompts" },
  ];

  return (
    <div className="flex h-full w-16 flex-col items-center space-y-2 bg-gradient-to-b from-aurora-50/30 to-aurora-50/50 p-2 text-white transition-all duration-300 ease-in-out dark:from-gray-900/95 dark:to-gray-900/80 sm:w-20">
      {icons.map(({ icon, name, label }) => (
        <div
          className={`group relative w-full rounded-lg transition-all duration-300 ease-in-out ${
            selectedIcon === name
              ? "bg-aurora-100 dark:bg-slate-700"
              : "hover:bg-aurora-200 dark:hover:bg-slate-600"
          }`}
          key={name}
        >
          <button
            className={`flex w-full flex-col items-center justify-center px-3 py-2 transition-all duration-300 ease-in-out ${
              selectedIcon === name
                ? "text-aurora-800 dark:text-slate-300"
                : "text-gray-400 group-hover:text-aurora-800 dark:text-gray-500 dark:group-hover:text-gray-300"
            }`}
            onClick={() => onIconClick(name)}
            data-tooltip-id={name}
            data-tooltip-content={label}
          >
            <FontAwesomeIcon icon={icon} size="lg" />
            <span className="mt-1 hidden text-[10px] font-medium opacity-80 sm:inline">
              {label}
            </span>
          </button>
        </div>
      ))}
    </div>
  );
};

export default Sidebar;
