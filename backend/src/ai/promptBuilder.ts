import type {
  WorkflowNode,
} from "../modules/workflows/workflow.types.js";

interface BuildAgentPromptInput {
  node: WorkflowNode;

  workflowPrompt?: string;

  dependencyOutputs: Record<
    string,
    unknown
  >;

  agentName: string;

  agentDescription?: string;
}

function stringifyOutput(
  value: unknown,
): string {
  if (
    typeof value ===
    "string"
  ) {
    return value;
  }

  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return "결과 없음";
  }

  try {
    return JSON.stringify(
      value,
      null,
      2,
    );
  } catch {
    return String(
      value,
    );
  }
}

export function buildAgentPrompt(
  input: BuildAgentPromptInput,
) {
  const {
    node,
    workflowPrompt,
    dependencyOutputs,
    agentName,
    agentDescription,
  } =
    input;

  const dependencyEntries =
    Object.entries(
      dependencyOutputs,
    );

  const dependencyText =
    dependencyEntries.length ===
    0
      ? "이전 Step 결과가 없습니다."
      : dependencyEntries
          .map(
            ([
              nodeId,
              output,
            ]) => {
              return [
                `### ${nodeId}`,
                stringifyOutput(
                  output,
                ),
              ].join(
                "\n",
              );
            },
          )
          .join(
            "\n\n",
          );

  const systemPrompt =
    [
      `당신은 Agent Workspace에서 실행되는 "${agentName}"입니다.`,

      agentDescription
        ? `Agent 역할: ${agentDescription}`
        : "",

      `현재 담당하는 Workflow Step은 "${node.name}"입니다.`,

      node.description
        ? `Step 설명: ${node.description}`
        : "",

      "사용자의 전체 목표를 유지하면서 현재 Step에 해당하는 작업을 수행하세요.",

      "이전 Step 결과가 제공된 경우 반드시 참고하세요.",

      "다음 Workflow Step이 활용할 수 있도록 결과를 명확하고 구체적으로 작성하세요.",

      "현재 Step과 관계없는 작업까지 임의로 수행하지 마세요.",
    ]
      .filter(
        Boolean,
      )
      .join(
        "\n",
      );

  const userPromptParts: string[] =
    [
      "## 사용자의 원본 요청",

      workflowPrompt ??
        "사용자의 원본 요청이 제공되지 않았습니다.",

      "",

      "## 현재 Workflow Step",

      node.name,
    ];

  if (
    node.config?.prompt
  ) {
    userPromptParts.push(
      "",
      "## 현재 Step 추가 지시",
      node.config.prompt,
    );
  }

  userPromptParts.push(
    "",
    "## 이전 Workflow Step 결과",
    dependencyText,
  );

  return {
    systemPrompt,

    userPrompt:
      userPromptParts.join(
        "\n",
      ),
  };
}