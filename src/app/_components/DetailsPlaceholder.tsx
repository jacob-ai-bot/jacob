import React, { useMemo } from "react";

const ILLUSTRATION_IMAGE_NAMES = [
  "panda.png",
  "cat.png",
  "dog.png",
  "elephant.png",
  "fox.png",
  "hedgehog.png",
  "owl.png",
  "otter.png",
  "hippo.png",
];

const TodoDetailsPlaceholder: React.FC = () => {
  const illustration = useMemo(() => {
    // Get a random illustration from the illustrations folder
    return ILLUSTRATION_IMAGE_NAMES[
      Math.floor(Math.random() * ILLUSTRATION_IMAGE_NAMES.length)
    ];
  }, []);

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      <img
        className="w-1/2 dark:mix-blend-multiply"
        src={`/images/illustrations/${illustration}`}
        alt="No Todos"
      />
      <div className="absolute left-1/2 top-16 z-10 -translate-x-1/2 text-center">
        <h2 className="mb-4 text-2xl font-bold text-gray-800 dark:text-gray-200">
          All todos completed!
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Time to relax and recharge.
        </p>
      </div>
    </div>
  );
};

export default TodoDetailsPlaceholder;
