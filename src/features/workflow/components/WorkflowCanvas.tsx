import {
  addEdge,
  Controls,
  MarkerType,
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
  WorkflowCondition,
  WorkflowEdge,
  WorkflowNode,
} from "../types";

import {
  CustomWorkflowNode,
} from "./CustomWorkflowNode";

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
    (
      node,
    ) => ({
      id:
        node.id,

      position:
        node.position,

      data: {
        label:
          node.name,

        description:
          node.description,

        type:
          node.type,
      },

      type:
        "workflowNode",
    }),
  );
}

function convertEdges(
  workflowEdges: WorkflowEdge[],
): Edge[] {
  return workflowEdges.map(
    (
      edge,
    ) => ({
      id:
        edge.id,

      source:
        edge.source,

      target:
        edge.target,

      sourceHandle:
        edge.sourceHandle,

      targetHandle:
        edge.targetHandle,

      type:
        "smoothstep",

      markerEnd: {
        type:
          MarkerType.ArrowClosed,

        width:
          14,

        height:
          14,
      },

      label:
        edge.condition
          ? formatConditionLabel(
              edge.condition,
            )
          : undefined,

      className:
        edge.condition
          ? "workflow-flow-edge workflow-flow-edge--conditional"
          : "workflow-flow-edge",
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
  const nodeTypes =
    useMemo(
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
  ] =
    useNodesState(
      convertNodes(
        nodes,
      ),
    );

  const [
    flowEdges,
    setFlowEdges,
    onEdgesChange,
  ] =
    useEdgesState(
      convertEdges(
        edges,
      ),
    );

  useEffect(
    () => {
      setFlowNodes(
        convertNodes(
          nodes,
        ),
      );
    },
    [
      nodes,
      setFlowNodes,
    ],
  );

  useEffect(
    () => {
      setFlowEdges(
        convertEdges(
          edges,
        ),
      );
    },
    [
      edges,
      setFlowEdges,
    ],
  );

  const handleNodesChange = (
    changes: NodeChange<Node>[],
  ) => {
    onNodesChange(
      changes,
    );

    changes.forEach(
      (
        change,
      ) => {
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
      (
        currentEdges,
      ) =>
        addEdge(
          {
            ...connection,

            type:
              "smoothstep",

            markerEnd: {
              type:
                MarkerType.ArrowClosed,

              width:
                14,

              height:
                14,
            },

            className:
              "workflow-flow-edge",
          },
          currentEdges,
        ),
    );

    onEdgeCreate?.(
      connection.source,
      connection.target,
    );
  };

  const displayedNodes =
    flowNodes.map(
      (
        node,
      ) => ({
        ...node,

        selected:
          node.id ===
          selectedNodeId,
      }),
    );

  return (
    <section className="workflow-canvas">
      <ReactFlow
        nodes={
          displayedNodes
        }
        edges={
          flowEdges
        }
        nodeTypes={
          nodeTypes
        }
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
          onNodeSelect?.(
            "",
          );
        }}
        onEdgesDelete={(
          deletedEdges,
        ) => {
          deletedEdges.forEach(
            (
              edge,
            ) => {
              onEdgeDelete?.(
                edge.id,
              );
            },
          );
        }}
        fitView
        fitViewOptions={{
          padding:
            0.25,
        }}
        minZoom={
          0.3
        }
        maxZoom={
          2
        }
        deleteKeyCode={
          onEdgeDelete
            ? [
                "Backspace",
                "Delete",
              ]
            : null
        }
      >
        <Controls />

        <MiniMap
          pannable
          zoomable
        />
      </ReactFlow>
    </section>
  );
}

function formatConditionLabel(
  condition: WorkflowCondition,
) {
  const value =
    formatConditionValue(
      condition.value,
    );

  return `${condition.field} ${formatConditionOperator(
    condition.operator,
  )} ${value}`;
}

function formatConditionOperator(
  operator:
    WorkflowCondition["operator"],
) {
  switch (
    operator
  ) {
    case "equals":
      return "=";

    case "not_equals":
      return "≠";

    case "contains":
      return "contains";

    case "gt":
      return ">";

    case "gte":
      return "≥";

    case "lt":
      return "<";

    case "lte":
      return "≤";
  }
}

function formatConditionValue(
  value: unknown,
) {
  if (
    typeof value ===
    "string"
  ) {
    return value;
  }

  if (
    typeof value ===
      "number" ||
    typeof value ===
      "boolean"
  ) {
    return String(
      value,
    );
  }

  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return "-";
  }

  try {
    return JSON.stringify(
      value,
    );
  } catch {
    return String(
      value,
    );
  }
}