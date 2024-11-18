import React, { useEffect, useRef } from "react";
import mermaid from "mermaid";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faExpand,
  faCompress,
  faCopy,
} from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";

interface MermaidProps {
  chart: string;
  theme: "light" | "dark";
}

const Mermaid: React.FC<MermaidProps> = ({ chart, theme }) => {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [hideDiagram, setHideDiagram] = React.useState(false);
  const [isFullScreen, setIsFullScreen] = React.useState(false);

  useEffect(() => {
    setHideDiagram(false);
    mermaid.initialize({
      startOnLoad: true,
      theme: theme === "light" ? "neutral" : "dark",
      securityLevel: "loose",
      fontFamily: "Fira Code, monospace",
      fontSize: 12,
      darkMode: theme === "dark",
    });

    const cleanAndFixChart = (chart: string): string => {
      // Remove code blocks
      let cleanedChart = chart.replace(/```mermaid\n?|\n?```/g, "").trim();

      // Replace invalid characters (like slashes) in class names with underscores
      cleanedChart = cleanedChart.replace(
        /(\s+|-->|:)\s*([a-zA-Z0-9_-]*\/[a-zA-Z0-9_-]*)\s*/g,
        (match, p1, p2) => {
          const fixedName = p2.replace(/\//g, "_");
          return `${p1} ${fixedName} `;
        },
      );
      // If the chart doesn't start with classDiagram but contains classDiagram, remove beginning of string until classDiagram
      if (
        !cleanedChart.startsWith("classDiagram") &&
        cleanedChart.includes("classDiagram")
      ) {
        cleanedChart = cleanedChart.substring(
          cleanedChart.indexOf("classDiagram"),
        );
      }

      return cleanedChart;
    };

    const renderChart = async () => {
      if (mermaidRef.current) {
        const fixedChart = cleanAndFixChart(chart);

        try {
          // Check if the chart is valid before rendering
          const isValid = await mermaid.parse(fixedChart);

          if (isValid) {
            const { svg } = await mermaid.render("mermaid-diagram", fixedChart);
            mermaidRef.current.innerHTML = svg;
          } else {
            console.error("Invalid Mermaid diagram");
            setHideDiagram(true);
          }
        } catch (error) {
          console.error("Mermaid rendering failed:", error);
          setHideDiagram(true);
        }
      }
    };

    // wait for mermaid to be initialized before rendering
    const interval = setInterval(() => {
      if (mermaid.mermaidAPI) {
        clearInterval(interval);
        void renderChart();
      }
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(chart);
      toast.success("Copied to clipboard");
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      toast.error("Failed to copy to clipboard");
    }
  };

  if (hideDiagram) {
    return null;
  }

  const containerClasses = isFullScreen
    ? "fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-800 -translate-y-4"
    : "relative rounded bg-white p-2 text-xs shadow-sm dark:bg-gray-800";

  return (
    <AnimatePresence>
      <motion.div
        className={containerClasses}
        initial={isFullScreen ? { opacity: 0 } : false}
        animate={isFullScreen ? { opacity: 1 } : undefined}
        exit={isFullScreen ? { opacity: 0 } : undefined}
        transition={{ duration: 0.2 }}
      >
        <div className="absolute right-2 top-2 flex gap-2">
          <button
            onClick={copyToClipboard}
            className="rounded p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            title="Copy Mermaid code"
          >
            <FontAwesomeIcon icon={faCopy} />
          </button>
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="rounded p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            title={isFullScreen ? "Exit full screen" : "Enter full screen"}
          >
            <FontAwesomeIcon icon={isFullScreen ? faCompress : faExpand} />
          </button>
        </div>
        <div
          ref={mermaidRef}
          className={`h-full w-full ${isFullScreen ? "p-8" : ""}`}
        />
      </motion.div>
    </AnimatePresence>
  );
};

export default Mermaid;
