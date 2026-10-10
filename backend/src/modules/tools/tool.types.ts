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

  createdAt: string;

  updatedAt: string;
}

export interface UpdateToolInput {
  name?: string;

  description?: string;

  enabled?: boolean;
}