import {
  Bot,
  GitBranch,
  Hand,
  Inbox,
  PackageCheck,
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

interface NodeLibraryItem {
  type: WorkflowNodeType;
  label: string;
  description: string;
  icon: typeof Bot;
}

const nodeItems: NodeLibraryItem[] = [
  {
    type: "input",
    label: "Input",
    description:
      "Workflow에 전달할 사용자 입력을 정의합니다.",
    icon: Inbox,
  },
  {
    type: "agent",
    label: "Agent",
    description:
      "AI Agent가 추론과 작업을 수행합니다.",
    icon: Bot,
  },
  {
    type: "tool",
    label: "Tool",
    description:
      "외부 Tool 또는 기능을 실행합니다.",
    icon: Wrench,
  },
  {
    type: "condition",
    label: "Condition",
    description:
      "State 값에 따라 실행 경로를 분기합니다.",
    icon: GitBranch,
  },
  {
    type: "approval",
    label: "Human Approval",
    description:
      "사용자 승인을 받을 때까지 실행을 대기합니다.",
    icon: Hand,
  },
  {
    type: "output",
    label: "Output",
    description:
      "Workflow의 최종 결과를 출력합니다.",
    icon: PackageCheck,
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

      name:
        getDefaultNodeName(
          type,
        ),

      description:
        getDefaultDescription(
          type,
        ),

      position: {
        x: 300,
        y: 300,
      },

      config: {
        retryCount: 0,
        timeoutSeconds: 600,
        requireApproval:
          type ===
          "approval",
      },
    };

    onAddNode(
      node,
    );
  };

  return (
    <aside className="node-library">
      <div className="node-library__header">
        <h2>
          Nodes
        </h2>

        <p>
          필요한 단계를 선택하여 Workflow Canvas에
          추가하세요.
        </p>
      </div>

      <div className="node-library__items">
        {nodeItems.map(
          (
            item,
          ) => {
            const Icon =
              item.icon;

            return (
              <button
                key={
                  item.type
                }
                type="button"
                className={[
                  "node-library__item",
                  `node-library__item--${item.type}`,
                ].join(
                  " ",
                )}
                title={`${item.label} Node 추가`}
                onClick={() => {
                  handleAddNode(
                    item.type,
                  );
                }}
              >
                <span className="node-library__item-icon">
                  <Icon
                    size={14}
                  />
                </span>

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
          },
        )}
      </div>
    </aside>
  );
}

function getDefaultNodeName(
  type: WorkflowNodeType,
) {
  switch (
    type
  ) {
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
  switch (
    type
  ) {
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