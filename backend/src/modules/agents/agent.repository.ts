import type {
  Agent,
  CreateAgentInput,
  UpdateAgentInput,
} from "./agent.types.js";

const initialAgents: Agent[] = [
  {
    id: "planner-agent",

    name: "Planner Agent",

    description:
      "사용자 요청을 분석하고 Workflow 실행 계획을 수립합니다.",

    modelId: "gpt-4o",

    toolIds: [],

    enabled: true,

    createdAt:
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString(),
  },

  {
    id: "research-agent",

    name: "Research Agent",

    description:
      "웹과 문서를 조사하여 필요한 정보를 수집합니다.",

    modelId:
      "claude-3-5-sonnet",

    toolIds: [
      "web-search",
      "browser",
    ],

    enabled: true,

    createdAt:
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString(),
  },

  {
    id: "analysis-agent",

    name: "Analysis Agent",

    description:
      "수집된 정보를 분석하고 핵심 인사이트를 추출합니다.",

    modelId:
      "gemini-2-5-pro",

    toolIds: [],

    enabled: true,

    createdAt:
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString(),
  },

  {
    id: "writer-agent",

    name: "Writer Agent",

    description:
      "분석 결과를 문서 형태로 작성합니다.",

    modelId: "gpt-4o",

    toolIds: [
      "file-tool",
    ],

    enabled: true,

    createdAt:
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString(),
  },

  {
    id: "reviewer-agent",

    name: "Reviewer Agent",

    description:
      "생성된 결과를 검토하고 개선점을 확인합니다.",

    modelId: "gpt-4o",

    toolIds: [],

    enabled: true,

    createdAt:
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString(),
  },
];

let agents =
  structuredClone(
    initialAgents,
  );

export function findAllAgents(): Agent[] {
  return structuredClone(
    agents,
  );
}

export function findAgentById(
  agentId: string,
): Agent | undefined {
  const agent =
    agents.find(
      (item) =>
        item.id === agentId,
    );

  return agent
    ? structuredClone(
        agent,
      )
    : undefined;
}

export function createAgent(
  input: CreateAgentInput,
): Agent {
  const now =
    new Date().toISOString();

  const agent: Agent = {
    id:
      `agent-${crypto.randomUUID()}`,

    name:
      input.name,

    description:
      input.description,

    modelId:
      input.modelId,

    toolIds:
      input.toolIds ?? [],

    enabled:
      input.enabled ?? true,

    createdAt: now,

    updatedAt: now,
  };

  agents.push(
    agent,
  );

  return structuredClone(
    agent,
  );
}

export function updateAgent(
  agentId: string,
  input: UpdateAgentInput,
): Agent | undefined {
  const index =
    agents.findIndex(
      (agent) =>
        agent.id === agentId,
    );

  if (index < 0) {
    return undefined;
  }

  const current =
    agents[index];

  if (!current) {
    return undefined;
  }

  const updated: Agent = {
    ...current,
    ...input,

    updatedAt:
      new Date().toISOString(),
  };

  agents[index] =
    updated;

  return structuredClone(
    updated,
  );
}

export function deleteAgent(
  agentId: string,
): boolean {
  const originalLength =
    agents.length;

  agents =
    agents.filter(
      (agent) =>
        agent.id !== agentId,
    );

  return (
    agents.length <
    originalLength
  );
}