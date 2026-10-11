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

  /*
   * Agent Node가 아닌 경우에는
   * 현재 단계에서는 별도의 AI 실행 없이
   * 일반 Node 완료 결과를 반환한다.
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

  /*
   * Agent Node에는 반드시
   * Agent가 연결되어 있어야 한다.
   */
  if (!node.agentId) {
    throw new Error(
      `${node.name} Node에 Agent가 연결되어 있지 않습니다.`,
    );
  }

  /*
   * Agent 정보를 DB에서 조회한다.
   */
  const agent =
    await getAgent(
      node.agentId,
    );

  if (!agent) {
    throw new Error(
      `Agent를 찾을 수 없습니다: ${node.agentId}`,
    );
  }

  /*
   * 비활성화된 Agent는 실행하지 않는다.
   */
  if (!agent.enabled) {
    throw new Error(
      `${agent.name} Agent가 비활성화되어 있습니다.`,
    );
  }

  /*
   * 현재 Model 선택 우선순위는
   *
   * Agent Model
   * → Workflow Node Model
   *
   * 기존 Runtime 동작을 유지한다.
   */
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
   * Set을 사용해서 중복 Tool ID는 제거한다.
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
   * 현재 실제 Tool Runtime으로 구현되어 있는
   * Web Search만 실행한다.
   *
   * 아직 실제 실행기가 없는 Tool은
   * 여기에서 건너뛴다.
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

  /*
   * Workflow 실행 Context를 기반으로
   * 기본 Agent Prompt를 생성한다.
   *
   * 여기에는 다음과 같은 Runtime 정보가
   * 포함될 수 있다.
   *
   * - Workflow 사용자 요청
   * - 이전 Node 결과
   * - Tool 결과
   * - Agent 이름/설명
   * - 현재 Node 정보
   */
  const {
    systemPrompt:
      runtimeSystemPrompt,

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

  /*
   * STEP 42
   *
   * Agent에 사용자가 직접 정의한 System Prompt와
   * Runtime에서 생성한 System Prompt를 결합한다.
   *
   * Agent System Prompt:
   *   Agent의 역할 / 성격 / 행동 원칙
   *
   * Runtime System Prompt:
   *   현재 Workflow 실행에 필요한 실행 규칙
   *
   * 둘 중 하나가 비어 있어도 정상 작동한다.
   */
  const systemPrompt =
    buildEffectiveSystemPrompt(
      agent.systemPrompt,
      runtimeSystemPrompt,
    );

  /*
   * STEP 42
   *
   * Agent 실행 설정을 실제 AI Provider 요청까지 전달한다.
   *
   * OpenAI:
   * - instructions
   * - temperature
   * - max_output_tokens
   *
   * Gemini:
   * - systemInstruction
   * - temperature
   * - maxOutputTokens
   */
  const aiResult =
    await executeAgent({
      modelId,

      systemPrompt,

      userPrompt,

      temperature:
        agent.temperature,

      maxTokens:
        agent.maxTokens,
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

/*
 * Agent가 직접 설정한 System Prompt와
 * Runtime System Prompt를 하나로 결합한다.
 *
 * Agent Prompt를 앞쪽에 배치해서
 * Agent의 Role을 먼저 정의하고,
 *
 * Runtime Prompt를 뒤쪽에 추가해서
 * 현재 Workflow 실행 Context를 제공한다.
 */
function buildEffectiveSystemPrompt(
  agentSystemPrompt:
    | string
    | undefined,

  runtimeSystemPrompt:
    | string
    | undefined,
) {
  return [
    agentSystemPrompt
      ?.trim(),

    runtimeSystemPrompt
      ?.trim(),
  ]
    .filter(
      (
        value,
      ): value is string =>
        Boolean(
          value,
        ),
    )
    .join(
      "\n\n",
    );
}

function buildSearchQuery(
  workflowPrompt:
    | string
    | undefined,

  nodeName:
    string,

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