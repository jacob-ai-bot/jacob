import { type FC } from "react";

export const ChatLoader: FC = () => {
  return (
    <div className="flex-start flex flex-col">
      <div
        className={`flex w-fit items-center rounded-2xl bg-blueGray-700/80 px-4 py-2 text-neutral-900`}
        style={{ overflowWrap: "anywhere" }}
      >
        <div className="flex flex-row items-center justify-center space-x-1">
          <div className="h-2 w-2 animate-bounce-fast rounded-full bg-light-blue [animation-delay:-0.15s]"></div>
          <div className="h-2 w-2 animate-bounce-fast rounded-full bg-pink  [animation-delay:-0.8s]"></div>
          <div className="h-2 w-2 animate-bounce-fast rounded-full bg-orange"></div>
        </div>
      </div>
    </div>
  );
};
