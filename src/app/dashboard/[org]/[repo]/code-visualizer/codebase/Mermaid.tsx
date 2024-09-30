import React, { useEffect, useRef } from "react";
import mermaid from "mermaid";

interface MermaidProps {
  chart: string;
  theme: "light" | "dark";
}

const Mermaid: React.FC<MermaidProps> = ({ chart, theme }) => {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [hideDiagram, setHideDiagram] = React.useState(false);

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

  if (hideDiagram) {
    return null;
  }
  return (
    <div
      ref={mermaidRef}
      className="rounded bg-white p-2 text-xs shadow-sm dark:bg-gray-800"
    />
  );
};

export default Mermaid;
