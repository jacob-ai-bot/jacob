import { motion } from "framer-motion";

export const LoadingIndicator = () => (
  <div className="flex items-center justify-center space-x-2 p-2">
    {[
      { light: "#BBDEFB", dark: "#B2EBF2" },
      { light: "#FFCCBC", dark: "#D1C4E9" },
      { light: "#B2DFDB", dark: "#E0E7FF" },
    ].map((colors, index) => (
      <motion.div
        key={index}
        className={`h-3 w-3 rounded-full bg-[${colors.light}] dark:bg-[${colors.dark}]`}
        animate={{
          y: ["0%", "-50%", "0%"],
        }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: index * 0.15,
        }}
      />
    ))}
  </div>
);

export default LoadingIndicator;
