import React, { useEffect, useRef } from "react";
import mermaid from "mermaid";

interface MermaidProps {
  chart: string;
}

const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
  // The chart is surrounded by a markdown code block, so we need to remove it
  chart = chart.replace(/^```mermaid\n/, "").replace(/\n```$/, "");
  console.log(chart);

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: "dark",
      securityLevel: "loose",
    });
    mermaid.contentLoaded();
  }, []);

  useEffect(() => {
    if (ref.current) {
      void mermaid.render(
        "mermaid",
        `graph TD
  A[Home] --> B[Header]
  A --> C[HeroSection]
  A --> D[FeatureList]
  A --> E[Footer]`,
        (svgCode) => {
          if (ref.current) {
            console.log("svgCode", svgCode);
            ref.current.innerHTML = svgCode;
          }
        },
      );
    }
  }, [chart]);

  return <div ref={ref} className="mermaid" />;
};

export default Mermaid;
