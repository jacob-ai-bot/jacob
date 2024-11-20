import React from "react";
import AnimatedShinyText from "~/app/_components/magicui/animated-shiny-text";
import { Meteors } from "~/app/_components/magicui/meteors";

const TodoItemPlaceholder: React.FC = () => {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      <Meteors number={20} />
      <div className="absolute left-1/2 top-16 z-10 -translate-x-1/2 text-center">
        <AnimatedShinyText className="mb-4 text-2xl font-bold">
          Inbox zero achieved! 🎉
        </AnimatedShinyText>
        <p className="text-gray-600 dark:text-gray-400">
          Why not take a little break? <br /> You deserve it.
        </p>
      </div>
    </div>
  );
};

export default TodoItemPlaceholder;
