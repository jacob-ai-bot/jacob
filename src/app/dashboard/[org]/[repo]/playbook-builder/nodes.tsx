import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";

const nodeStyle = {
  padding: 10,
  borderRadius: 5,
  width: 150,
  fontSize: 12,
  color: "#222",
  textAlign: "center" as const,
  border: "1px solid #1a192b",
};

export const ActionNode = memo(({ data }: { data: any }) => {
  return (
    <div style={{ ...nodeStyle, background: "#D6E4FF" }}>
      <Handle type="target" position={Position.Top} />
      <div>{data.label}</div>
      <div>{data.actionType}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});

export const ControlFlowNode = memo(({ data }: { data: any }) => {
  return (
    <div style={{ ...nodeStyle, background: "#FFEDD5" }}>
      <Handle type="target" position={Position.Top} />
      <div>{data.label}</div>
      <div>{data.condition}</div>
      <Handle type="source" position={Position.Bottom} id="a" />
      <Handle
        type="source"
        position={Position.Bottom}
        id="b"
        style={{ left: "75%" }}
      />
    </div>
  );
});

export const AnnotationNode = memo(({ data }: { data: any }) => {
  return (
    <div
      style={{
        ...nodeStyle,
        background: "#E0F2FE",
        border: "1px dashed #1a192b",
      }}
    >
      <div>{data.label}</div>
      <div>{data.note}</div>
    </div>
  );
});
