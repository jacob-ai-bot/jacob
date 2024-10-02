type ComponentProps = {
  imageUrl?: string;
};

export const DesignComponent: React.FC<ComponentProps> = ({ imageUrl }) => {
  return (
    <div className="flex h-full flex-grow flex-col rounded-lg bg-gradient-to-b from-aurora-50/70 to-30% px-6 pb-6 pt-2 shadow-md transition-all dark:from-aurora-800/80 dark:to-aurora-800/20 dark:shadow-blueGray-800/80">
      <div className="mb-3 flex w-full items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          Design
        </h2>
      </div>
      <div className="rounded-lg border border-aurora-500/30 bg-neutral-50 p-6 dark:border-aurora-600/30 dark:bg-gray-800">
        {imageUrl ? (
          <div className="overflow-hidden rounded-lg">
            <img src={imageUrl} alt="Design" className="h-auto w-full" />
          </div>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400">
            No design found for this task
          </div>
        )}
      </div>
    </div>
  );
};

export default DesignComponent;
