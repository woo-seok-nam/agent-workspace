export type ProviderType =
  | "openai"
  | "anthropic"
  | "google"
  | "local";

export type ProviderConnectionStatus =
  | "connected"
  | "not_configured"
  | "error";

export interface Provider {
  id: ProviderType;

  name: string;

  description: string;

  enabled: boolean;

  connectionStatus:
    ProviderConnectionStatus;

  createdAt: string;

  updatedAt: string;
}

export interface UpdateProviderInput {
  enabled?: boolean;

  connectionStatus?:
    ProviderConnectionStatus;
}