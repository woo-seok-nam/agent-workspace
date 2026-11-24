export type ProviderId = "openai" | "gemini" | "claude";
export interface ModelRequest { prompt: string; system: string; maxTokens: number; signal?: AbortSignal; responseSchema?: Record<string, unknown> }
export interface ModelResult { provider: ProviderId; model: string; text: string }
export interface Provider { generate(request: ModelRequest): Promise<ModelResult> }
export interface Settings { key: string; model: string }
export class AgentError extends Error {}
