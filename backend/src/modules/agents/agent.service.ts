import {
  createAgent,
  deleteAgent,
  findAgentById,
  findAllAgents,
  updateAgent,
} from "./agent.repository.js";

import type {
  CreateAgentInput,
  UpdateAgentInput,
} from "./agent.types.js";

export function getAgents() {
  return findAllAgents();
}

export function getAgent(
  agentId: string,
) {
  return findAgentById(
    agentId,
  );
}

export function addAgent(
  input: CreateAgentInput,
) {
  if (
    !input.name?.trim()
  ) {
    throw new Error(
      "Agent 이름은 필수입니다.",
    );
  }

  if (
    !input.modelId?.trim()
  ) {
    throw new Error(
      "modelId는 필수입니다.",
    );
  }

  return createAgent({
    ...input,

    name:
      input.name.trim(),

    description:
      input.description?.trim(),
  });
}

export function editAgent(
  agentId: string,
  input: UpdateAgentInput,
) {
  if (
    input.name !== undefined &&
    !input.name.trim()
  ) {
    throw new Error(
      "Agent 이름은 비어 있을 수 없습니다.",
    );
  }

  return updateAgent(
    agentId,
    {
      ...input,

      name:
        input.name?.trim(),

      description:
        input.description?.trim(),
    },
  );
}

export function removeAgent(
  agentId: string,
) {
  return deleteAgent(
    agentId,
  );
}