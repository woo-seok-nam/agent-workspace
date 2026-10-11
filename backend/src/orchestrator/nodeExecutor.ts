import {
  executeAgent,
} from "../ai/agentExecutor.js";

import {
  buildAgentPrompt,
} from "../ai/promptBuilder.js";

import {
  getAgent,
} from "../modules/agents/agent.service.js";

import {
  executeTool,
} from "../tools/toolExecutor.js";

import type {
  ToolExecutionResult,
} from "../tools/tool.types.js";

import type {
  NodeExecutionContext,
  NodeExecutionResult,
} from "./orchestrator.types.js";

export async function executeNode(
  context: NodeExecutionContext,
): Promise<NodeExecutionResult> {
  const {
    node,
    run,
    dependencyOutputs,
  } =
    context;

  if (
    node.type !==
    "agent"
  ) {
    return {
      output: {
        nodeId:
          node.id,

        nodeName:
          node.name,

        message:
          `${node.name} Node가 완료되었습니다.`,
      },

      tokenUsage:
        0,

      cost:
        0,
    };
  }

  if (!node.agentId) {
    throw new Error(
      `${node.name} Node에 Agent가 연결되어 있지 않습니다.`,
    );
  }

  const agent =
    await getAgent(
      node.agentId,
    );

  if (!agent) {
    throw new Error(
      `Agent를 찾을 수 없습니다: ${node.agentId}`,
    );
  }

  if (!agent.enabled) {
    throw new Error(
      `${agent.name} Agent가 비활성화되어 있습니다.`,
    );
  }

  const modelId =
    agent.modelId ||
    node.modelId;

  if (!modelId) {
    throw new Error(
      `${agent.name} Agent에 Model이 설정되어 있지 않습니다.`,
    );
  }

  /*
   * Agent에 설정된 Tool과
   * Workflow Node에 설정된 Tool을 합친다.
   *
   * 중복 Tool ID는 제거한다.
   */
  const assignedToolIds =
    Array.from(
      new Set([
        ...(agent.toolIds ??
          []),

        ...(node.toolIds ??
          []),
      ]),
    );

  const toolResults:
    ToolExecutionResult[] =
      [];

  /*
   * STEP 27에서는 Web Search만 실제 실행한다.
   *
   * 아직 구현하지 않은 Tool은
   * 실행하지 않고 건너뛴다.
   */
  for (
    const toolId
    of assignedToolIds
  ) {
    if (
      toolId !==
      "web-search"
    ) {
      continue;
    }

    const searchQuery =
      buildSearchQuery(
        run.prompt,
        node.name,
        node.description,
      );

    const toolResult =
      await executeTool({
        toolId,

        query:
          searchQuery,
      });

    toolResults.push(
      toolResult,
    );
  }

  const {
    systemPrompt,
    userPrompt,
  } =
    buildAgentPrompt({
      node,

      workflowPrompt:
        run.prompt,

      dependencyOutputs,

      toolResults,

      agentName:
        agent.name,

      agentDescription:
        agent.description,
    });

  const aiResult =
    await executeAgent({
      modelId,

      systemPrompt,

      userPrompt,
    });

  return {
    output: {
      text:
        aiResult.text,

      agentId:
        agent.id,

      agentName:
        agent.name,

      provider:
        aiResult.provider,

      modelId:
        aiResult.modelId,

      inputTokens:
        aiResult.inputTokens,

      outputTokens:
        aiResult.outputTokens,

      totalTokens:
        aiResult.tokenUsage,

      tools:
        toolResults,
    },

    tokenUsage:
      aiResult.tokenUsage,

    cost:
      aiResult.cost,
  };
}

function buildSearchQuery(
  workflowPrompt:
    | string
    | undefined,
  nodeName: string,
  nodeDescription:
    | string
    | undefined,
) {
  return [
    workflowPrompt ??
      "",

    nodeName,

    nodeDescription ??
      "",
  ]
    .filter(
      Boolean,
    )
    .join(
      " ",
    )
    .trim();
}