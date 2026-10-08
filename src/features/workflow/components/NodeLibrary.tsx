import {
  Bot,
  GitBranch,
  Hand,
  PackageOpen,
  Wrench,
} from "lucide-react";

import type {
  WorkflowNode,
  WorkflowNodeType,
} from "../types";

interface NodeLibraryProps {
  onAddNode: (
    node: WorkflowNode,
  ) => void;
}

const nodeItems: {
  type: WorkflowNodeType;
  label: string;
  description: string;
  icon: typeof Bot;
}[] = [
  {
    type: "agent",
    label: "Agent",
    description:
      "AI Agent 작업 단계를 추가합니다.",
    icon: Bot,
  },
  {
    type: "tool",
    label: "Tool",
    description:
      "Tool 실행 단계를 추가합니다.",
    icon: Wrench,
  },
  {
    type: "input",
    label: "Input",
    description:
      "Workflow 입력을 추가합니다.",
    icon: PackageOpen,
  },
  {
    type: "condition",
    label: "Condition",
    description:
      "조건 분기를 추가합니다.",
    icon: GitBranch,
  },
  {
    type: "approval",
    label: "Human Approval",
    description:
      "사용자 승인 단계를 추가합니다.",
    icon: Hand,
  },
  {
    type: "output",
    label: "Output",
    description:
      "Workflow 출력을 추가합니다.",
    icon: PackageOpen,
  },
];

export function NodeLibrary({
  onAddNode,
}: NodeLibraryProps) {
  const handleAddNode = (
    type: WorkflowNodeType,
  ) => {
    const nodeId =
      `${type}-${crypto.randomUUID()}`;

    const node: WorkflowNode = {
      id: nodeId,

      type,

      name: getDefaultNodeName(type),

      description:
        getDefaultDescription(type),

      position: {
        x: 300,
        y: 300,
      },

      config: {
        retryCount: 0,
        timeoutSeconds: 600,
        requireApproval:
          type === "approval",
      },
    };

    onAddNode(node);
  };

  return (
    <aside className="node-library">
      <div className="node-library__header">
        <h2>Nodes</h2>

        <p>
          클릭하여 Node를 추가합니다.
        </p>
      </div>

      <div className="node-library__items">
        {nodeItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.type}
              type="button"
              className="node-library__item"
              onClick={() =>
                handleAddNode(
                  item.type,
                )
              }
            >
              <Icon size={15} />

              <div>
                <strong>
                  {item.label}
                </strong>

                <span>
                  {item.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function getDefaultNodeName(
  type: WorkflowNodeType,
) {
  switch (type) {
    case "input":
      return "User Input";

    case "agent":
      return "New Agent";

    case "tool":
      return "New Tool";

    case "condition":
      return "Condition";

    case "approval":
      return "Human Approval";

    case "output":
      return "Output";
  }
}

function getDefaultDescription(
  type: WorkflowNodeType,
) {
  switch (type) {
    case "input":
      return "사용자 입력";

    case "agent":
      return "Agent 작업";

    case "tool":
      return "Tool 실행";

    case "condition":
      return "조건에 따라 실행 경로 분기";

    case "approval":
      return "사용자 승인 대기";

    case "output":
      return "최종 결과 출력";
  }
}