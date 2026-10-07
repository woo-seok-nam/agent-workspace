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