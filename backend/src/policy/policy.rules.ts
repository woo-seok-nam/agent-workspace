import type {
  CapabilityPolicyRule,
  ExecutionCapability,
} from "./policy.types.js";

export const defaultCapabilityPolicies:
  Record<
    ExecutionCapability,
    CapabilityPolicyRule
  > = {
    AI_MODEL: {
      capability:
        "AI_MODEL",

      riskLevel:
        "LOW",

      decision:
        "ALLOW",

      reason:
        "일반적인 AI Model 실행은 자동 실행할 수 있습니다.",
    },

    WEB_SEARCH: {
      capability:
        "WEB_SEARCH",

      riskLevel:
        "LOW",

      decision:
        "ALLOW",

      reason:
        "웹 검색은 외부 정보를 읽는 작업으로 자동 실행할 수 있습니다.",
    },

    DOCUMENT_PARSING: {
      capability:
        "DOCUMENT_PARSING",

      riskLevel:
        "LOW",

      decision:
        "ALLOW",

      reason:
        "문서 파싱은 입력 데이터를 분석하는 읽기 중심 작업입니다.",
    },

    BROWSER: {
      capability:
        "BROWSER",

      riskLevel:
        "MEDIUM",

      decision:
        "REQUIRE_APPROVAL",

      reason:
        "Browser Tool은 외부 웹 서비스와 상호작용할 수 있어 사용자 승인이 필요합니다.",
    },

    FILE_ACCESS: {
      capability:
        "FILE_ACCESS",

      riskLevel:
        "MEDIUM",

      decision:
        "REQUIRE_APPROVAL",

      reason:
        "File Tool은 파일 시스템에 접근할 수 있어 사용자 승인이 필요합니다.",
    },

    EXTERNAL_API: {
      capability:
        "EXTERNAL_API",

      riskLevel:
        "HIGH",

      decision:
        "REQUIRE_APPROVAL",

      reason:
        "외부 API 호출은 외부 시스템에 영향을 줄 수 있어 사용자 승인이 필요합니다.",
    },

    CODE_EXECUTION: {
      capability:
        "CODE_EXECUTION",

      riskLevel:
        "HIGH",

      decision:
        "REQUIRE_APPROVAL",

      reason:
        "Code Tool은 실행 환경의 상태를 변경할 수 있어 사용자 승인이 필요합니다.",
    },

    HUMAN_APPROVAL: {
      capability:
        "HUMAN_APPROVAL",

      riskLevel:
        "MEDIUM",

      decision:
        "REQUIRE_APPROVAL",

      reason:
        "이 단계는 명시적인 사용자 승인을 요구하도록 구성되어 있습니다.",
    },

    UNKNOWN_TOOL: {
      capability:
        "UNKNOWN_TOOL",

      riskLevel:
        "CRITICAL",

      decision:
        "DENY",

      reason:
        "등록되지 않았거나 확인할 수 없는 Tool은 실행할 수 없습니다.",
    },
  };