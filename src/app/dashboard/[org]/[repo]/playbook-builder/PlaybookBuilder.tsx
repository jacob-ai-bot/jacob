"use client";

import React, { useState, useCallback } from "react";
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  type Connection,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { api } from "~/trpc/react";
import { useToast } from "~/components/ui/use-toast";
import NodeConfigPanel from "./NodeConfigPanel";
import { ActionNode, ControlFlowNode, AnnotationNode } from "./nodes";

const nodeTypes = {
  actionNode: ActionNode,
  controlFlowNode: ControlFlowNode,
  annotationNode: AnnotationNode,
};

interface PlaybookBuilderProps {
  org: string;
  repo: string;
}

const PlaybookBuilder: React.FC<PlaybookBuilderProps> = ({ org, repo }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const { toast } = useToast();

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const addNode = useCallback(
    (type: string) => {
      const newNode = {
        id: `${type}-${Date.now()}`,
        type,
        position: { x: Math.random() * 500, y: Math.random() * 500 },
        data: { label: `New ${type}` },
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes],
  );

  const savePlaybook = api.playbooks.create.useMutation({
    onSuccess: () => {
      toast({
        title: "Playbook saved successfully",
        description: "Your playbook has been saved to the database.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error saving playbook",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = useCallback(() => {
    const playbookData = {
      nodes,
      edges,
    };
    savePlaybook.mutate({
      projectId: 1, // Replace with actual project ID
      name: "My Playbook", // Replace with user input
      description: "A sample playbook", // Replace with user input
      playbookData,
    });
  }, [nodes, edges, savePlaybook]);

  return (
    <ReactFlowProvider>
      <div style={{ width: "100%", height: "100vh" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
        >
          <Controls />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>
        <div style={{ position: "absolute", left: 10, top: 10, zIndex: 4 }}>
          <button onClick={() => addNode("actionNode")}>Add Action Node</button>
          <button onClick={() => addNode("controlFlowNode")}>
            Add Control Flow Node
          </button>
          <button onClick={() => addNode("annotationNode")}>
            Add Annotation Node
          </button>
          <button onClick={handleSave}>Save Playbook</button>
        </div>
        {selectedNode && (
          <NodeConfigPanel
            node={selectedNode}
            onChange={(updatedNode) => {
              setNodes((nds) =>
                nds.map((node) =>
                  node.id === updatedNode.id ? updatedNode : node,
                ),
              );
            }}
          />
        )}
      </div>
    </ReactFlowProvider>
  );
};

export default PlaybookBuilder;
