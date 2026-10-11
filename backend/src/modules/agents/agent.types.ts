export interface Agent {
  id: string;

  name: string;

  description?: string;

  modelId: string;

  toolIds: string[];

  enabled: boolean;

  systemPrompt?: string;

  temperature: number;

  maxTokens: number;

  retryCount: number;

  timeoutSeconds: number;

  createdAt: string;

  updatedAt: string;
}

export interface CreateAgentInput {
  name: string;

  description?: string;

  modelId: string;

  toolIds?: string[];

  enabled?: boolean;

  systemPrompt?: string;

  temperature?: number;

  maxTokens?: number;

  retryCount?: number;

  timeoutSeconds?: number;
}

export interface UpdateAgentInput {
  name?: string;

  description?: string;

  modelId?: string;

  toolIds?: string[];

  enabled?: boolean;

  systemPrompt?: string;

  temperature?: number;

  maxTokens?: number;

  retryCount?: number;

  timeoutSeconds?: number;
}