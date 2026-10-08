import {
  Bot,
  FileOutput,
  GitBranch,
  Hand,
  PackageOpen,
  Wrench,
} from "lucide-react";

import {
  Handle,
  Position,
  type NodeProps,
} from "@xyflow/react";

interface WorkflowNodeData {
  label: string;

  description?: string;

  type:
    | "input"
    | "agent"
    | "tool"
    | "condition"
    | "approval"
    | "output";
}

function getNodeIcon(
  type: WorkflowNodeData["type"],
) {
  switch (type) {
    case "input":
      return PackageOpen;

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

    default:
      return Bot;
  }
}

export function CustomWorkflowNode({
  data,
  selected,
}: NodeProps) {
  const nodeData =
    data as unknown as WorkflowNodeData;

  const Icon =
    getNodeIcon(nodeData.type);

  return (
    <div
      className={[
        "custom-workflow-node",
        `custom-workflow-node--${nodeData.type}`,
        selected
          ? "custom-workflow-node--selected"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {nodeData.type !== "input" && (
        <Handle
          id="target-top"
          type="target"
          position={Position.Top}
          className="custom-node-handle"
        />
      )}

      <div className="custom-workflow-node__icon">
        <Icon size={15} />
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
      </div>

      {nodeData.type !== "output" && (
        <Handle
          id="source-bottom"
          type="source"
          position={Position.Bottom}
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
      return "사용자 입력";

    case "agent":
      return "Agent 작업";

    case "tool":
      return "Tool 실행";

    case "condition":
      return "조건 분기";

    case "approval":
      return "사용자 승인";

    case "output":
      return "결과 출력";
  }
}