import React from "react";

type ComponentProps = {
  imageUrl?: string;
};

export const DesignComponent: React.FC<ComponentProps> = ({ imageUrl }) => {
  return (
    <div className="flex h-full min-h-full w-full flex-grow flex-col p-2 pt-0">
      <div className="w-full py-2 ">
        <h2 className="text-lg font-semibold text-white">Design</h2>
        <hr className="my-2 border-t border-gray-700" />
      </div>
      <div className="hide-scrollbar h-full overflow-auto rounded-lg border border-blueGray-700 bg-black p-4 font-mono text-sm text-white">
        {imageUrl ? (
          <div>
            <img src={imageUrl} alt="Design" className="h-auto w-full" />
          </div>
        ) : (
          <div className="text-center text-gray-500">
            No design found for this task
          </div>
        )}
      </div>
    </div>
  );
};

export default DesignComponent;
