import type {
  AIModel,
} from "../features/tools/types";

export const mockModels: AIModel[] = [
  {
    id: "gpt-4o",
    name: "gpt-4o",
    displayName: "GPT-4o",
    provider: "openai",
    enabled: true,
  },
  {
    id: "gemini-1.5-pro",
    name: "gemini-1.5-pro",
    displayName: "Gemini 1.5 Pro",
    provider: "google",
    enabled: false,
  },
  {
    id: "gemini-2.5-flash",
    name: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    provider: "google",
    enabled: false,
  },
  {
    id: "gemini-3.8-flash",
    name: "gemini-3.8-flash",
    displayName: "Gemini 3.8 Flash",
    provider: "google",
    enabled: true,
  },
];