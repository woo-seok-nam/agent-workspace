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