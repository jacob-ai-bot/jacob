import React, { useEffect, useRef } from "react";
import mermaid from "mermaid";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faExpand,
  faCompress,
  faCopy,
} from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import Modal from "react-modal";

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

  const customStyles = {
    content: {
      top: "50%",
      left: "50%",
      right: "auto",
      bottom: "auto",
      marginRight: "-50%",
      transform: "translate(-50%, -50%)",
      maxWidth: "90%",
      maxHeight: "90%",
      width: "90vw",
      height: "90vh",
      padding: "20px",
      borderRadius: "8px",
      border: "none",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      zIndex: 99999,
      backgroundColor: theme === "light" ? "white" : "#1f2937",
    },
    overlay: {
      backgroundColor: "rgba(0, 0, 0, 0.75)",
      zIndex: 9999,
    },
  };

  if (hideDiagram) {
    return null;
  }

  const containerClasses = `relative rounded bg-white p-2 text-xs shadow-sm dark:bg-gray-800 ${
    !isFullScreen ? "w-full" : ""
  }`;

  const buttonClasses =
    "absolute top-2 p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 rounded";

  const renderContent = () => (
    <div className={containerClasses}>
      <button
        onClick={() => setIsFullScreen(!isFullScreen)}
        className={`${buttonClasses} right-12`}
        title={isFullScreen ? "Exit full screen" : "Full screen"}
      >
        <FontAwesomeIcon icon={isFullScreen ? faCompress : faExpand} />
      </button>
      <button
        onClick={copyToClipboard}
        className={`${buttonClasses} right-2`}
        title="Copy Mermaid code"
      >
        <FontAwesomeIcon icon={faCopy} />
      </button>
      <div ref={mermaidRef} />
    </div>
  );

  return isFullScreen ? (
    <Modal
      isOpen={isFullScreen}
      onRequestClose={() => setIsFullScreen(false)}
      style={customStyles}
      contentLabel="Mermaid Diagram"
      ariaHideApp={false}
    >
      {renderContent()}
    </Modal>
  ) : (
    renderContent()
  );
};

export default Mermaid;
