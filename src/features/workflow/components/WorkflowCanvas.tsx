import {
  addEdge,
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
} from "@xyflow/react";

import { useEffect } from "react";

import "@xyflow/react/dist/style.css";

import type {
  WorkflowEdge,
  WorkflowNode,
} from "../types";

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];

  edges: WorkflowEdge[];

  selectedNodeId?: string | null;

  onNodeSelect?: (nodeId: string) => void;

  onNodePositionChange?: (
    nodeId: string,
    position: {
      x: number;
      y: number;
    },
  ) => void;

  onEdgeCreate?: (
    source: string,
    target: string,
  ) => void;
}

function convertNodes(
  workflowNodes: WorkflowNode[],
): Node[] {
  return workflowNodes.map((node) => ({
    id: node.id,

    position: node.position,

    data: {
      label: node.name,
      description: node.description,
      type: node.type,
    },

    type: "default",
  }));
}

function convertEdges(
  workflowEdges: WorkflowEdge[],
): Edge[] {
  return workflowEdges.map((edge) => ({
    id: edge.id,

    source: edge.source,

    target: edge.target,

    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
  }));
}

export function WorkflowCanvas({
  nodes,
  edges,
  selectedNodeId,
  onNodeSelect,
  onNodePositionChange,
  onEdgeCreate,
}: WorkflowCanvasProps) {
  const [flowNodes, setFlowNodes, onNodesChange] =
    useNodesState(convertNodes(nodes));

  const [flowEdges, setFlowEdges, onEdgesChange] =
    useEdgesState(convertEdges(edges));

  useEffect(() => {
    setFlowNodes(convertNodes(nodes));
  }, [nodes, setFlowNodes]);

  useEffect(() => {
    setFlowEdges(convertEdges(edges));
  }, [edges, setFlowEdges]);

  const handleNodesChange = (
    changes: NodeChange<Node>[],
  ) => {
    onNodesChange(changes);

    changes.forEach((change) => {
      if (
        change.type === "position" &&
        change.position &&
        change.dragging === false
      ) {
        onNodePositionChange?.(
          change.id,
          change.position,
        );
      }
    });
  };

  const handleConnect = (
    connection: Connection,
  ) => {
    if (!connection.source || !connection.target) {
      return;
    }

    setFlowEdges((currentEdges) =>
      addEdge(connection, currentEdges),
    );

    onEdgeCreate?.(
      connection.source,
      connection.target,
    );
  };

  return (
    <section className="workflow-canvas">
      <ReactFlow
        nodes={flowNodes.map((node) => ({
          ...node,
          selected: node.id === selectedNodeId,
        }))}
        edges={flowEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeClick={(_, node) => {
          onNodeSelect?.(node.id);
        }}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{
          padding: 0.25,
        }}
        minZoom={0.3}
        maxZoom={2}
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