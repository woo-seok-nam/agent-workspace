export type AIProvider =
  | "openai"
  | "google";

export interface AIExecutionInput {
  modelId: string;

  systemPrompt: string;

  userPrompt: string;
}

export interface AIExecutionResult {
  text: string;

  provider: AIProvider;

  modelId: string;

  inputTokens: number;

  outputTokens: number;

  tokenUsage: number;

  cost: number;
}