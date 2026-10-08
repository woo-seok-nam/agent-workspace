import type { AIModel } from "../features/tools/types";

export const mockModels: AIModel[] = [
  {
    id: "gpt-4o",
    provider: "openai",
    name: "gpt-4o",
    displayName: "GPT-4o",
    enabled: true,
  },
  {
    id: "claude-3-5-sonnet",
    provider: "anthropic",
    name: "claude-3-5-sonnet",
    displayName: "Claude 3.5 Sonnet",
    enabled: true,
  },
  {
    id: "gemini-1-5-pro",
    provider: "google",
    name: "gemini-1.5-pro",
    displayName: "Gemini 1.5 Pro",
    enabled: true,
  },
];