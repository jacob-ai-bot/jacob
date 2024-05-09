import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCode,
  faPaintBrush,
  faTerminal,
  faClipboardList,
  faCommentDots,
  faBug,
  faCodeBranch,
} from "@fortawesome/free-solid-svg-icons";
import { Tooltip } from "react-tooltip";
import { SidebarIcon } from "~/types";

interface SidebarProps {
  selectedIcon: SidebarIcon;
  onIconClick: (icon: SidebarIcon) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ selectedIcon, onIconClick }) => {
  const icons = [
    { icon: faClipboardList, name: SidebarIcon.Plan },
    { icon: faCode, name: SidebarIcon.Code },
    { icon: faTerminal, name: SidebarIcon.Terminal },
    { icon: faBug, name: SidebarIcon.Issues },
    { icon: faCodeBranch, name: SidebarIcon.PullRequests },
    { icon: faPaintBrush, name: SidebarIcon.Design },
    { icon: faCommentDots, name: SidebarIcon.Prompts },
  ];

  return (
    <div className="flex h-full w-12 flex-col items-center space-y-1 bg-gray-800 text-white">
      {icons.map(({ icon, name }) => (
        <div
          className={`w-full ${selectedIcon === name ? "bg-gray-900/50" : ""} p-4 text-center`}
          key={name}
        >
          <div
            className={`cursor-pointer transition-all duration-1000 ease-in-out ${selectedIcon === name ? "animate-pulse text-light-blue" : "text-beige/40 hover:text-white"}`}
            onClick={() => onIconClick(name)}
            data-tooltip-id={name}
            data-tooltip-content={name}
          >
            <FontAwesomeIcon icon={icon} size={"lg"} />
          </div>
        </div>
      ))}
      {icons.map(({ name }) => (
        <Tooltip id={name} key={name} />
      ))}
    </div>
  );
};

export default Sidebar;
