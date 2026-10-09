export type ProviderType =
  | "openai"
  | "anthropic"
  | "google"
  | "local";

export interface AIModel {
  id: string;

  provider: ProviderType;

  name: string;

  displayName: string;

  enabled: boolean;
}

export type ToolType =
  | "web_search"
  | "browser"
  | "file"
  | "api"
  | "code"
  | "document_parser";

export interface Tool {
  id: string;

  name: string;

  description?: string;

  type: ToolType;

  enabled: boolean;
}

export interface ProviderConfig {
  id: ProviderType;

  name: string;

  description: string;

  enabled: boolean;

  connectionStatus:
    | "connected"
    | "not_configured"
    | "error";
}