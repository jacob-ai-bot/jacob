import uniqueId from "lodash/uniqueId";
import React, { useMemo } from "react";

interface CircleTextProps {
  r: number;
  rotate?: number;
  text: string;
  style?: any;
  fill?: string;
  stroke?: string;
  strokeWidth?: string;
  strokeOpacity?: number;
}
export const CircleText = ({
  r = 10,
  rotate = 0,
  text = "",
  strokeOpacity = 1,
  ...props
}: CircleTextProps) => {
  const id = useMemo(() => uniqueId("CircleText--"), []);

  return (
    <>
      <path
        fill="none"
        d={[
          ["M", 0, r].join(" "),
          ["A", r, r, 0, 0, 1, 0, -r].join(" "),
          ["A", r, r, 0, 0, 1, 0, r].join(" "),
        ].join(" ")}
        id={id}
        transform={`rotate(${rotate})`}
        style={{ pointerEvents: "none" }}
      ></path>
      <text textAnchor="middle" {...props}>
        <textPath href={`#${id}`} startOffset="50%">
          {text}
        </textPath>
      </text>
    </>
  );
};
