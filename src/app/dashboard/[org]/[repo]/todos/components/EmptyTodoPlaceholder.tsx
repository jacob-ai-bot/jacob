import React from "react";
import AnimatedShinyText from "~/app/_components/magicui/animated-shiny-text";
import { Meteors } from "~/app/_components/magicui/meteors";

const EmptyTodoPlaceholder: React.FC = () => {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      <Meteors number={20} />
      <div className="z-10 text-center">
        <AnimatedShinyText className="mb-4 text-2xl font-bold">
          Inbox zero achieved! 🚀
        </AnimatedShinyText>
        <p className="text-gray-600 dark:text-gray-400">
          Time to conquer new horizons. What&apos;s your next big move?
        </p>
      </div>
    </div>
  );
};

export default EmptyTodoPlaceholder;
