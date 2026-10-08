import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import type {
  WorkflowEdge,
  WorkflowNode,
} from "../types";

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];

  onNodeSelect?: (nodeId: string) => void;
}

export function WorkflowCanvas({
  nodes,
  edges,
  onNodeSelect,
}: WorkflowCanvasProps) {
  const flowNodes: Node[] = nodes.map((node) => ({
    id: node.id,

    position: node.position,

    data: {
      label: node.name,
      description: node.description,
      type: node.type,
    },

    type: "default",
  }));

  const flowEdges: Edge[] = edges.map((edge) => ({
    id: edge.id,

    source: edge.source,
    target: edge.target,
  }));

  return (
    <section className="workflow-canvas">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        fitView
        onNodeClick={(_, node) => {
          onNodeSelect?.(node.id);
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1}
        />

        <Controls />

        <MiniMap />
      </ReactFlow>
    </section>
  );
}