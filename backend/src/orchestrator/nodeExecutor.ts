import {
  executeAgent,
} from "../ai/agentExecutor.js";

import {
  buildAgentPrompt,
} from "../ai/promptBuilder.js";

import {
  getAgent,
} from "../modules/agents/agent.service.js";

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

  /*
   * 현재 STEP 26에서는
   * Agent Node에 대해서만 실제 LLM을 호출한다.
   *
   * Tool Node 등의 실제 실행은
   * STEP 27에서 추가한다.
   */
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

  /*
   * STEP 26에서는 Agent Management에서
   * 설정한 modelId를 우선 사용한다.
   *
   * 기존 Workflow Seed의 Research Node 등에
   * claude modelId가 남아 있어도,
   * Agent의 modelId를 Gemini로 변경하면
   * Gemini Provider를 사용할 수 있다.
   */
  const modelId =
    agent.modelId ||
    node.modelId;

  if (!modelId) {
    throw new Error(
      `${agent.name} Agent에 Model이 설정되어 있지 않습니다.`,
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
    },

    tokenUsage:
      aiResult.tokenUsage,

    cost:
      aiResult.cost,
  };
}