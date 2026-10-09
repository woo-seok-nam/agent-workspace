import type {
  Agent,
} from "../features/agents/types";

import type {
  AIModel,
  ProviderConfig,
  Tool,
} from "../features/tools/types";

import {
  mockAgents,
} from "../mocks/agents";

import {
  mockModels,
} from "../mocks/models";

import {
  mockProviders,
} from "../mocks/providers";

import {
  mockTools,
} from "../mocks/tools";

const AGENT_STORAGE_KEY =
  "agent-workspace-agents";

const TOOL_STORAGE_KEY =
  "agent-workspace-tools";

const PROVIDER_STORAGE_KEY =
  "agent-workspace-providers";

function clone<T>(
  value: T,
): T {
  return structuredClone(value);
}

/* =========================
   Agents
========================= */

export function getAgents(): Agent[] {
  const saved =
    localStorage.getItem(
      AGENT_STORAGE_KEY,
    );

  if (!saved) {
    return clone(
      mockAgents,
    );
  }

  try {
    return JSON.parse(
      saved,
    ) as Agent[];
  } catch {
    localStorage.removeItem(
      AGENT_STORAGE_KEY,
    );

    return clone(
      mockAgents,
    );
  }
}

export function saveAgents(
  agents: Agent[],
) {
  localStorage.setItem(
    AGENT_STORAGE_KEY,
    JSON.stringify(
      agents,
    ),
  );
}

export function getAgentById(
  agentId?: string,
) {
  if (!agentId) {
    return undefined;
  }

  return getAgents().find(
    (agent) =>
      agent.id === agentId,
  );
}

export function getEnabledAgents() {
  return getAgents().filter(
    (agent) =>
      agent.enabled,
  );
}

/* =========================
   Tools
========================= */

export function getTools(): Tool[] {
  const saved =
    localStorage.getItem(
      TOOL_STORAGE_KEY,
    );

  if (!saved) {
    return clone(
      mockTools,
    );
  }

  try {
    return JSON.parse(
      saved,
    ) as Tool[];
  } catch {
    localStorage.removeItem(
      TOOL_STORAGE_KEY,
    );

    return clone(
      mockTools,
    );
  }
}

export function saveTools(
  tools: Tool[],
) {
  localStorage.setItem(
    TOOL_STORAGE_KEY,
    JSON.stringify(
      tools,
    ),
  );
}

export function getToolById(
  toolId?: string,
) {
  if (!toolId) {
    return undefined;
  }

  return getTools().find(
    (tool) =>
      tool.id === toolId,
  );
}

export function getEnabledTools() {
  return getTools().filter(
    (tool) =>
      tool.enabled,
  );
}

/* =========================
   Models
========================= */

export function getModels(): AIModel[] {
  return clone(
    mockModels,
  );
}

export function getModelById(
  modelId?: string,
) {
  if (!modelId) {
    return undefined;
  }

  return getModels().find(
    (model) =>
      model.id === modelId,
  );
}

export function getEnabledModels() {
  return getModels().filter(
    (model) =>
      model.enabled,
  );
}

/* =========================
   Providers
========================= */

export function getProviders(): ProviderConfig[] {
  const saved =
    localStorage.getItem(
      PROVIDER_STORAGE_KEY,
    );

  if (!saved) {
    return clone(
      mockProviders,
    );
  }

  try {
    return JSON.parse(
      saved,
    ) as ProviderConfig[];
  } catch {
    localStorage.removeItem(
      PROVIDER_STORAGE_KEY,
    );

    return clone(
      mockProviders,
    );
  }
}

export function saveProviders(
  providers: ProviderConfig[],
) {
  localStorage.setItem(
    PROVIDER_STORAGE_KEY,
    JSON.stringify(
      providers,
    ),
  );
}

export function getProviderById(
  providerId?: string,
) {
  if (!providerId) {
    return undefined;
  }

  return getProviders().find(
    (provider) =>
      provider.id === providerId,
  );
}

/* =========================
   Reset
========================= */

export function resetCatalogData() {
  localStorage.removeItem(
    AGENT_STORAGE_KEY,
  );

  localStorage.removeItem(
    TOOL_STORAGE_KEY,
  );

  localStorage.removeItem(
    PROVIDER_STORAGE_KEY,
  );
}