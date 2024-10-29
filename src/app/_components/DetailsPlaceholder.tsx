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
        alt="Todo Details"
      />
    </div>
  );
};

export default TodoDetailsPlaceholder;
