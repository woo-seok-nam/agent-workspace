import type {
  ProviderConfig,
} from "../features/tools/types";

export const mockProviders: ProviderConfig[] = [
  {
    id: "openai",

    name: "OpenAI",

    description:
      "GPT 계열 모델을 사용하는 AI Provider입니다.",

    enabled: true,

    connectionStatus:
      "not_configured",
  },

  {
    id: "anthropic",

    name: "Anthropic",

    description:
      "Claude 계열 모델을 사용하는 AI Provider입니다.",

    enabled: true,

    connectionStatus:
      "not_configured",
  },

  {
    id: "google",

    name: "Google",

    description:
      "Gemini 계열 모델을 사용하는 AI Provider입니다.",

    enabled: true,

    connectionStatus:
      "not_configured",
  },

  {
    id: "local",

    name: "Local Model",

    description:
      "로컬 환경에서 실행되는 AI 모델을 연결합니다.",

    enabled: false,

    connectionStatus:
      "not_configured",
  },
];