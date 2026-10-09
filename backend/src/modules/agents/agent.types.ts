export interface Agent {
  id: string;

  name: string;

  description?: string;

  modelId: string;

  toolIds: string[];

  enabled: boolean;

  createdAt: string;

  updatedAt: string;
}

export interface CreateAgentInput {
  name: string;

  description?: string;

  modelId: string;

  toolIds?: string[];

  enabled?: boolean;
}

export interface UpdateAgentInput {
  name?: string;

  description?: string;

  modelId?: string;

  toolIds?: string[];

  enabled?: boolean;
}