import {
  addEdge,
  Background,
  BackgroundVariant,
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

import {
  useEffect,
  useMemo,
} from "react";

import "@xyflow/react/dist/style.css";

import type {
  WorkflowEdge,
  WorkflowNode,
} from "../types";

import { CustomWorkflowNode } from "./CustomWorkflowNode";

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];

  edges: WorkflowEdge[];

  selectedNodeId?: string | null;

  onNodeSelect?: (
    nodeId: string,
  ) => void;

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

  onEdgeDelete?: (
    edgeId: string,
  ) => void;
}

function convertNodes(
  workflowNodes: WorkflowNode[],
): Node[] {
  return workflowNodes.map(
    (node) => ({
      id: node.id,

      position: node.position,

      data: {
        label: node.name,
        description:
          node.description,
        type: node.type,
      },

      type: "workflowNode",
    }),
  );
}

function convertEdges(
  workflowEdges: WorkflowEdge[],
): Edge[] {
  return workflowEdges.map(
    (edge) => ({
      id: edge.id,

      source: edge.source,
      target: edge.target,

      sourceHandle:
        edge.sourceHandle,

      targetHandle:
        edge.targetHandle,

      type: "smoothstep",
    }),
  );
}

export function WorkflowCanvas({
  nodes,
  edges,
  selectedNodeId,
  onNodeSelect,
  onNodePositionChange,
  onEdgeCreate,
  onEdgeDelete,
}: WorkflowCanvasProps) {
  const nodeTypes = useMemo(
    () => ({
      workflowNode:
        CustomWorkflowNode,
    }),
    [],
  );

  const [
    flowNodes,
    setFlowNodes,
    onNodesChange,
  ] = useNodesState(
    convertNodes(nodes),
  );

  const [
    flowEdges,
    setFlowEdges,
    onEdgesChange,
  ] = useEdgesState(
    convertEdges(edges),
  );

  useEffect(() => {
    setFlowNodes(
      convertNodes(nodes),
    );
  }, [
    nodes,
    setFlowNodes,
  ]);

  useEffect(() => {
    setFlowEdges(
      convertEdges(edges),
    );
  }, [
    edges,
    setFlowEdges,
  ]);

  const handleNodesChange = (
    changes: NodeChange<Node>[],
  ) => {
    onNodesChange(changes);

    changes.forEach(
      (change) => {
        if (
          change.type ===
            "position" &&
          change.position &&
          change.dragging ===
            false
        ) {
          onNodePositionChange?.(
            change.id,
            change.position,
          );
        }
      },
    );
  };

  const handleConnect = (
    connection: Connection,
  ) => {
    if (
      !connection.source ||
      !connection.target
    ) {
      return;
    }

    if (
      connection.source ===
      connection.target
    ) {
      return;
    }

    setFlowEdges(
      (currentEdges) =>
        addEdge(
          {
            ...connection,
            type: "smoothstep",
          },
          currentEdges,
        ),
    );

    onEdgeCreate?.(
      connection.source,
      connection.target,
    );
  };

  return (
    <section className="workflow-canvas">
      <ReactFlow
        nodes={flowNodes.map(
          (node) => ({
            ...node,

            selected:
              node.id ===
              selectedNodeId,
          }),
        )}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={
          handleNodesChange
        }
        onEdgesChange={
          onEdgesChange
        }
        onConnect={
          handleConnect
        }
        onNodeClick={(
          _,
          node,
        ) => {
          onNodeSelect?.(
            node.id,
          );
        }}
        onPaneClick={() => {
          onNodeSelect?.("");
        }}
        onEdgesDelete={(
          deletedEdges,
        ) => {
          deletedEdges.forEach(
            (edge) => {
              onEdgeDelete?.(
                edge.id,
              );
            },
          );
        }}
        fitView
        fitViewOptions={{
          padding: 0.25,
        }}
        minZoom={0.3}
        maxZoom={2}
        deleteKeyCode={[
          "Backspace",
          "Delete",
        ]}
      >
        <Background
          variant={
            BackgroundVariant.Dots
          }
          gap={18}
          size={1}
        />

        <Controls />

        <MiniMap
          pannable
          zoomable
        />
      </ReactFlow>
    </section>
  );
}