import { faEllipsisH } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { type FC } from "react";

export const ChatLoader: FC = () => {
  return (
    <div className="flex-start flex flex-col">
      <div
        className={`bg-purple_medium flex w-fit items-center rounded-2xl px-4 py-2 text-neutral-900`}
        style={{ overflowWrap: "anywhere" }}
      >
        <FontAwesomeIcon icon={faEllipsisH} className="animate-pulse" />
      </div>
    </div>
  );
};
