import React from "react";
import { useTheme } from "next-themes";
import { LoadingIndicator } from "../../components/LoadingIndicator";
import { Meteors } from "~/app/_components/magicui/meteors";
import { BorderBeam } from "~/app/_components/magicui/border-beam";
import AnimatedShinyText from "~/app/_components/magicui/animated-shiny-text";

interface LoadingCardProps {
  fileName?: string | null | undefined;
}

const COLOR_FROM_LIGHT = "#BBDEFB";
const COLOR_TO_LIGHT = "#B2EBF2";
const COLOR_FROM_DARK = "#D1C4E9";
const COLOR_TO_DARK = "#E0E7FF";

export const LoadingCard: React.FC<LoadingCardProps> = ({ fileName }) => {
  const { theme } = useTheme();

  return (
    <div className="relative mx-auto my-4 flex h-[140px] w-[400px] flex-col items-center justify-center overflow-hidden rounded-xl bg-aurora-50/20 p-2 dark:bg-gray-900/30">
      <Meteors number={30} />
      <BorderBeam
        duration={3}
        colorFrom={theme === "light" ? COLOR_FROM_LIGHT : COLOR_FROM_DARK}
        colorTo={theme === "light" ? COLOR_TO_LIGHT : COLOR_TO_DARK}
      />
      <AnimatedShinyText
        className="mb-1 text-lg font-semibold"
        shimmerWidth={200}
      >
        Writing Code...
      </AnimatedShinyText>
      <div className="flex items-center justify-center">
        <LoadingIndicator />
      </div>
      {fileName && (
        <div className="flex items-center justify-center overflow-hidden text-xs text-gray-600 dark:text-gray-300">
          File Name: {fileName}
        </div>
      )}
    </div>
  );
};
