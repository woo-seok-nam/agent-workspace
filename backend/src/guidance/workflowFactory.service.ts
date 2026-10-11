import {
  getAgents,
} from "../modules/agents/agent.service.js";

import type {
  Agent,
} from "../modules/agents/agent.types.js";

import {
  getTools,
} from "../modules/tools/tool.service.js";

import type {
  Tool,
} from "../modules/tools/tool.types.js";

import {
  addWorkflow,
} from "../modules/workflows/workflow.service.js";

import type {
  Workflow,
  WorkflowEdge,
  WorkflowNode,
} from "../modules/workflows/workflow.types.js";

import {
  getPlaybookById,
  recommendPlaybook,
} from "./playbook.service.js";

import type {
  PlaybookStep,
  WorkflowPlaybook,
} from "./playbook.types.js";

export interface CreateWorkflowFromGuidanceInput {
  goal: string;

  playbookId?: string;
}

export interface AgentAssignment {
  playbookStepId: string;

  nodeId: string;

  role?: string;

  agentId?: string;

  agentName?: string;

  modelId?: string;

  matchedToolIds: string[];

  fallbackUsed: boolean;
}

export interface CreateWorkflowFromGuidanceResult {
  workflow: Workflow;

  playbook: WorkflowPlaybook;

  assignments: AgentAssignment[];

  warnings: string[];
}

function normalizeText(
  value: string,
) {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /[_-]+/g,
      " ",
    )
    .replace(
      /[^a-z0-9가-힣\s]/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

function tokenize(
  value: string,
) {
  return normalizeText(
    value,
  )
    .split(
      " ",
    )
    .map(
      (token) =>
        token.trim(),
    )
    .filter(
      (token) =>
        token.length >=
        2,
    );
}

function scoreAgent(
  agent: Agent,
  step: PlaybookStep,
) {
  const role =
    step.role ??
    step.name;

  const normalizedRole =
    normalizeText(
      role,
    );

  const normalizedAgentName =
    normalizeText(
      agent.name,
    );

  const normalizedDescription =
    normalizeText(
      agent.description ??
        "",
    );

  let score =
    0;

  if (
    normalizedAgentName ===
    normalizedRole
  ) {
    score +=
      100;
  }

  if (
    normalizedAgentName.includes(
      normalizedRole,
    ) ||
    normalizedRole.includes(
      normalizedAgentName,
    )
  ) {
    score +=
      40;
  }

  const roleTokens =
    tokenize(
      role,
    );

  for (
    const token
    of roleTokens
  ) {
    if (
      normalizedAgentName.includes(
        token,
      )
    ) {
      score +=
        15;
    }

    if (
      normalizedDescription.includes(
        token,
      )
    ) {
      score +=
        5;
    }
  }

  /*
   * Step 이름/설명도 보조 근거로 사용한다.
   */
  const stepTokens =
    tokenize(
      `${step.name} ${step.description}`,
    );

  for (
    const token
    of stepTokens
  ) {
    if (
      normalizedAgentName.includes(
        token,
      )
    ) {
      score +=
        4;
    }

    if (
      normalizedDescription.includes(
        token,
      )
    ) {
      score +=
        2;
    }
  }

  return score;
}

function findBestAgent(
  step: PlaybookStep,
  agents: Agent[],
) {
  const enabledAgents =
    agents.filter(
      (agent) =>
        agent.enabled,
    );

  if (
    enabledAgents.length ===
    0
  ) {
    return {
      agent:
        undefined,

      fallbackUsed:
        false,
    };
  }

  const ranked =
    enabledAgents
      .map(
        (agent) => ({
          agent,

          score:
            scoreAgent(
              agent,
              step,
            ),
        }),
      )
      .sort(
        (
          left,
          right,
        ) =>
          right.score -
          left.score,
      );

  const bestMatch =
    ranked[0];

  if (
    bestMatch &&
    bestMatch.score >
      0
  ) {
    return {
      agent:
        bestMatch.agent,

      fallbackUsed:
        false,
    };
  }

  /*
   * 정확히 맞는 역할 Agent가 없어도
   * 실행 가능한 Workflow를 만들기 위해
   * 활성 Agent 중 첫 번째를 fallback으로 사용한다.
   *
   * UI/Builder에서 사용자가 이후 변경 가능하다.
   */
  return {
    agent:
      enabledAgents[0],

    fallbackUsed:
      true,
  };
}

function normalizeToolIdentifier(
  value: string,
) {
  return normalizeText(
    value,
  ).replace(
    /\s+/g,
    "",
  );
}

function toolMatchesRequirement(
  tool: Tool,
  requirement: string,
) {
  const normalizedRequirement =
    normalizeToolIdentifier(
      requirement,
    );

  const candidates = [
    tool.id,
    tool.name,
    tool.type,
  ].map(
    normalizeToolIdentifier,
  );

  return candidates.some(
    (candidate) =>
      candidate ===
        normalizedRequirement ||
      candidate.includes(
        normalizedRequirement,
      ) ||
      normalizedRequirement.includes(
        candidate,
      ),
  );
}

function findSuggestedTools(
  step: PlaybookStep,
  tools: Tool[],
) {
  const requirements =
    step.suggestedTools ??
    [];

  if (
    requirements.length ===
    0
  ) {
    return [];
  }

  const enabledTools =
    tools.filter(
      (tool) =>
        tool.enabled,
    );

  const matchedToolIds =
    new Set<string>();

  for (
    const requirement
    of requirements
  ) {
    const matchedTool =
      enabledTools.find(
        (tool) =>
          toolMatchesRequirement(
            tool,
            requirement,
          ),
      );

    if (
      matchedTool
    ) {
      matchedToolIds.add(
        matchedTool.id,
      );
    }
  }

  return [
    ...matchedToolIds,
  ];
}

function createNodeId() {
  return `node-${crypto.randomUUID()}`;
}

function createEdgeId() {
  return `edge-${crypto.randomUUID()}`;
}

function createNodePosition(
  index: number,
) {
  return {
    x:
      120 +
      index *
        280,

    y:
      220,
  };
}

function buildWorkflowName(
  goal: string,
  playbook: WorkflowPlaybook,
) {
  const normalizedGoal =
    goal.trim();

  if (
    normalizedGoal.length <=
    45
  ) {
    return `${normalizedGoal} - ${playbook.name}`;
  }

  return `${normalizedGoal.slice(
    0,
    45,
  )}... - ${playbook.name}`;
}

export async function createWorkflowFromGuidance(
  input: CreateWorkflowFromGuidanceInput,
): Promise<CreateWorkflowFromGuidanceResult> {
  const goal =
    input.goal?.trim();

  if (!goal) {
    throw new Error(
      "작업 목표는 필수입니다.",
    );
  }

  let playbook:
    WorkflowPlaybook | null =
      null;

  if (
    input.playbookId
  ) {
    playbook =
      getPlaybookById(
        input.playbookId,
      );

    if (!playbook) {
      throw new Error(
        "선택한 추천 가이던스를 찾을 수 없습니다.",
      );
    }
  } else {
    const recommendation =
      recommendPlaybook(
        goal,
      );

    playbook =
      recommendation.recommendedPlaybook;
  }

  if (!playbook) {
    throw new Error(
      "Workflow 생성에 사용할 추천 가이던스를 찾지 못했습니다.",
    );
  }

  const [
    agents,
    tools,
  ] =
    await Promise.all([
      getAgents(),

      getTools(),
    ]);

  const enabledAgents =
    agents.filter(
      (agent) =>
        agent.enabled,
    );

  if (
    enabledAgents.length ===
    0
  ) {
    throw new Error(
      "활성화된 Agent가 없습니다. Workflow를 자동 생성하려면 최소 1개의 활성 Agent가 필요합니다.",
    );
  }

  const nodeIdMap =
    new Map<
      string,
      string
    >();

  const nodes:
    WorkflowNode[] = [];

  const assignments:
    AgentAssignment[] = [];

  const warnings:
    string[] = [];

  for (
    let index =
      0;
    index <
    playbook.steps.length;
    index +=
      1
  ) {
    const step =
      playbook.steps[
        index
      ];

    if (!step) {
      continue;
    }

    const nodeId =
      createNodeId();

    nodeIdMap.set(
      step.id,
      nodeId,
    );

    const baseNode:
      WorkflowNode = {
        id:
          nodeId,

        type:
          step.type,

        name:
          step.name,

        description:
          step.description,

        position:
          createNodePosition(
            index,
          ),
      };

    if (
      step.type ===
      "agent"
    ) {
      const {
        agent,
        fallbackUsed,
      } =
        findBestAgent(
          step,
          agents,
        );

      if (!agent) {
        throw new Error(
          `${step.name} 단계에 배정할 수 있는 활성 Agent가 없습니다.`,
        );
      }

      const suggestedToolIds =
        findSuggestedTools(
          step,
          tools,
        );

      const toolIds =
        Array.from(
          new Set([
            ...agent.toolIds,

            ...suggestedToolIds,
          ]),
        );

      const node:
        WorkflowNode = {
          ...baseNode,

          agentId:
            agent.id,

          modelId:
            agent.modelId,

          toolIds,

          config: {
            retryCount:
              agent.retryCount,

            timeoutSeconds:
              agent.timeoutSeconds,
          },
        };

      nodes.push(
        node,
      );

      assignments.push({
        playbookStepId:
          step.id,

        nodeId,

        role:
          step.role,

        agentId:
          agent.id,

        agentName:
          agent.name,

        modelId:
          agent.modelId,

        matchedToolIds:
          toolIds,

        fallbackUsed,
      });

      if (
        fallbackUsed
      ) {
        warnings.push(
          `"${step.role ?? step.name}" 역할과 정확히 일치하는 Agent를 찾지 못해 "${agent.name}" Agent를 임시 배정했습니다.`,
        );
      }

      const requestedTools =
        step.suggestedTools ??
        [];

      for (
        const requestedTool
        of requestedTools
      ) {
        const found =
          tools.some(
            (tool) =>
              tool.enabled &&
              toolMatchesRequirement(
                tool,
                requestedTool,
              ),
          );

        if (!found) {
          warnings.push(
            `"${step.name}" 단계가 요청한 "${requestedTool}" Tool을 찾지 못했습니다.`,
          );
        }
      }

      continue;
    }

    if (
      step.type ===
      "approval"
    ) {
      nodes.push({
        ...baseNode,

        config: {
          requireApproval:
            true,
        },
      });

      continue;
    }

    nodes.push(
      baseNode,
    );
  }

  const edges:
    WorkflowEdge[] =
      playbook.edges.map(
        (
          playbookEdge,
        ) => {
          const source =
            nodeIdMap.get(
              playbookEdge.source,
            );

          const target =
            nodeIdMap.get(
              playbookEdge.target,
            );

          if (
            !source ||
            !target
          ) {
            throw new Error(
              `추천 가이던스 Edge를 Workflow Edge로 변환하지 못했습니다: ${playbookEdge.source} → ${playbookEdge.target}`,
            );
          }

          return {
            id:
              createEdgeId(),

            source,

            target,
          };
        },
      );

  const workflow =
    await addWorkflow({
      name:
        buildWorkflowName(
          goal,
          playbook,
        ),

      description:
        `${playbook.description} 사용자 목표: ${goal}`,

      nodes,

      edges,
    });

  return {
    workflow,

    playbook,

    assignments,

    warnings,
  };
}