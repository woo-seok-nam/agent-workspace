import type {
  Agent,
} from "../features/agents/types";

export const mockAgents: Agent[] = [
  {
    id:
      "planner-agent",

    name:
      "Planner Agent",

    description:
      "사용자의 목표를 분석하고 작업 계획을 생성합니다.",

    modelId:
      "gpt-4o",

    toolIds:
      [],

    enabled:
      true,

    systemPrompt:
      "사용자의 목표를 분석하고 실행 가능한 작업 계획을 수립하는 Planner Agent입니다.",

    temperature:
      0.2,

    maxTokens:
      4096,

    retryCount:
      2,

    timeoutSeconds:
      60,

    createdAt:
      "2026-10-01T09:00:00Z",

    updatedAt:
      "2026-10-01T09:00:00Z",
  },

  {
    id:
      "research-agent",

    name:
      "Research Agent",

    description:
      "웹 검색 및 자료 수집을 담당합니다.",

    modelId:
      "claude-3-5-sonnet",

    toolIds: [
      "web-search",
      "browser",
    ],

    enabled:
      true,

    systemPrompt:
      "필요한 정보를 조사하고 출처를 확인하여 신뢰할 수 있는 자료를 수집하는 Research Agent입니다.",

    temperature:
      0.2,

    maxTokens:
      4096,

    retryCount:
      2,

    timeoutSeconds:
      60,

    createdAt:
      "2026-10-01T09:00:00Z",

    updatedAt:
      "2026-10-01T09:00:00Z",
  },

  {
    id:
      "analysis-agent",

    name:
      "Analysis Agent",

    description:
      "수집된 데이터를 분석하고 핵심 내용을 정리합니다.",

    modelId:
      "gpt-4o",

    toolIds: [
      "document-parser",
    ],

    enabled:
      true,

    systemPrompt:
      "수집된 정보를 논리적으로 분석하고 핵심 내용과 의미 있는 패턴을 도출하는 Analysis Agent입니다.",

    temperature:
      0.2,

    maxTokens:
      4096,

    retryCount:
      2,

    timeoutSeconds:
      60,

    createdAt:
      "2026-10-01T09:00:00Z",

    updatedAt:
      "2026-10-01T09:00:00Z",
  },

  {
    id:
      "writer-agent",

    name:
      "Writer Agent",

    description:
      "분석 결과를 기반으로 문서를 작성합니다.",

    modelId:
      "gpt-4o",

    toolIds: [
      "file-write",
    ],

    enabled:
      true,

    systemPrompt:
      "분석된 내용을 바탕으로 명확하고 구조적인 최종 문서를 작성하는 Writer Agent입니다.",

    temperature:
      0.4,

    maxTokens:
      4096,

    retryCount:
      2,

    timeoutSeconds:
      60,

    createdAt:
      "2026-10-01T09:00:00Z",

    updatedAt:
      "2026-10-01T09:00:00Z",
  },

  {
    id:
      "reviewer-agent",

    name:
      "Reviewer Agent",

    description:
      "생성된 결과를 검토하고 품질을 확인합니다.",

    modelId:
      "claude-3-5-sonnet",

    toolIds:
      [],

    enabled:
      true,

    systemPrompt:
      "생성된 결과물의 정확성, 완성도, 누락 사항을 검토하고 개선점을 제시하는 Reviewer Agent입니다.",

    temperature:
      0.1,

    maxTokens:
      4096,

    retryCount:
      2,

    timeoutSeconds:
      60,

    createdAt:
      "2026-10-01T09:00:00Z",

    updatedAt:
      "2026-10-01T09:00:00Z",
  },
];