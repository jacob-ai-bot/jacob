// components/CodebaseVisualizer.tsx
import React, { useState, useCallback, useMemo } from "react";
import {
  ReactFlow,
  type Node,
  type Edge,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type FitViewOptions,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AnimatePresence } from "framer-motion";
import { type ContextItem } from "~/server/utils/codebaseContext";
import CodebaseNode from "./CodebaseNode";
import CodebaseDetails from "./CodebaseDetails";
import ParticleBackground from "./ParticleBackground";

const nodeTypes = {
  codebase: CodebaseNode,
};

interface CodebaseVisualizerProps {
  contextItems: ContextItem[];
}

const CodebaseVisualizerInner: React.FC<CodebaseVisualizerProps> = ({
  contextItems,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<ContextItem | null>(null);
  const { fitView, getNode } = useReactFlow();

  // Transform ContextItems into nodes and edges
  useMemo(() => {
    const newNodes: Node[] = contextItems.map((item, index) => ({
      id: item.file,
      type: "codebase",
      data: { label: item.file, item },
      position: { x: index * 250, y: Math.sin(index) * 100 },
    }));

    const newEdges: Edge[] = contextItems.flatMap((item) =>
      item.importedFiles.map((importedFile) => ({
        id: `${item.file}-${importedFile}`,
        source: item.file,
        target: importedFile,
        animated: true,
        style: { stroke: "url(#edge-gradient)" },
      })),
    );

    setNodes(newNodes);
    setEdges(newEdges);
  }, [contextItems, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      const nodePosition = getNode(node.id)?.position;
      if (nodePosition) {
        const fitViewOptions: FitViewOptions = {
          duration: 800,
          padding: 0.2,
        };
        fitView(fitViewOptions);
        setTimeout(() => setSelectedNode(node.data.item), 400);
      }
    },
    [getNode, fitView],
  );

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <ParticleBackground />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        className="transition-all duration-300 ease-in-out"
      >
        <defs>
          <linearGradient
            id="edge-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <Controls className="bg-blueGray-800 bg-opacity-75 backdrop-blur" />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case "codebase":
                return "#ec4899";
              default:
                return "#8b5cf6";
            }
          }}
          className="bg-blueGray-800 bg-opacity-75 backdrop-blur"
        />
        <Background color="#60a5fa" gap={16} />
      </ReactFlow>
      <AnimatePresence>
        {selectedNode && (
          <CodebaseDetails
            item={selectedNode}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Wrapper component that provides ReactFlowProvider
const CodebaseVisualizer: React.FC<CodebaseVisualizerProps> = (props) => {
  return (
    <ReactFlowProvider>
      <CodebaseVisualizerInner {...props} />
    </ReactFlowProvider>
  );
};

export default CodebaseVisualizer;
