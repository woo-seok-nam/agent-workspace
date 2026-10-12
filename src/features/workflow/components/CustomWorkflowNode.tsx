import {
  Bot,
  FileOutput,
  GitBranch,
  Hand,
  Inbox,
  Wrench,
} from "lucide-react";

import {
  Handle,
  Position,
  type NodeProps,
} from "@xyflow/react";

import type {
  WorkflowNodeType,
} from "../types";

interface WorkflowNodeData {
  label: string;

  description?: string;

  type: WorkflowNodeType;
}

function getNodeIcon(
  type: WorkflowNodeData["type"],
) {
  switch (type) {
    case "input":
      return Inbox;

    case "agent":
      return Bot;

    case "tool":
      return Wrench;

    case "condition":
      return GitBranch;

    case "approval":
      return Hand;

    case "output":
      return FileOutput;
  }
}

export function CustomWorkflowNode({
  data,
  selected,
}: NodeProps) {
  const nodeData =
    data as unknown as WorkflowNodeData;

  const Icon =
    getNodeIcon(
      nodeData.type,
    );

  return (
    <div
      className={[
        "custom-workflow-node",
        `custom-workflow-node--${nodeData.type}`,
        selected
          ? "custom-workflow-node--selected"
          : "",
      ]
        .filter(
          Boolean,
        )
        .join(
          " ",
        )}
    >
      {nodeData.type !==
        "input" && (
        <Handle
          id="target-top"
          type="target"
          position={
            Position.Top
          }
          className="custom-node-handle"
        />
      )}

      <div className="custom-workflow-node__icon">
        <Icon
          size={15}
        />
      </div>

      <div className="custom-workflow-node__content">
        <strong>
          {nodeData.label}
        </strong>

        <span>
          {nodeData.description ??
            getDefaultDescription(
              nodeData.type,
            )}
        </span>

        {nodeData.type ===
          "condition" && (
          <span className="condition-branch-badge">
            Conditional Branch
          </span>
        )}

        {nodeData.type ===
          "approval" && (
          <span className="approval-node-badge">
            Human Review
          </span>
        )}
      </div>

      {nodeData.type !==
        "output" && (
        <Handle
          id="source-bottom"
          type="source"
          position={
            Position.Bottom
          }
          className="custom-node-handle"
        />
      )}
    </div>
  );
}

function getDefaultDescription(
  type: WorkflowNodeData["type"],
) {
  switch (type) {
    case "input":
      return "Workflow 입력";

    case "agent":
      return "AI Agent 작업";

    case "tool":
      return "Tool 실행";

    case "condition":
      return "State 기반 조건 분기";

    case "approval":
      return "사용자 승인 대기";

    case "output":
      return "최종 결과 출력";
  }
}