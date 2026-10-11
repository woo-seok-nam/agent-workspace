export type ToolExecutionStatus =
  | "SUCCESS"
  | "FAILED";

export interface ToolExecutionResult {
  toolId: string;

  toolName: string;

  status: ToolExecutionStatus;

  output: unknown;

  startedAt: string;

  completedAt: string;
}

export interface WebSearchSource {
  title?: string;

  url?: string;
}

export interface WebSearchResult {
  query: string;

  text: string;

  sources: WebSearchSource[];
}