import type {
  Tool,
  ToolType,
} from "../modules/tools/tool.types.js";

import type {
  WorkflowNode,
} from "../modules/workflows/workflow.types.js";

import {
  defaultCapabilityPolicies,
} from "./policy.rules.js";

import type {
  CapabilityAssessment,
  ExecutionCapability,
  PolicyDecisionType,
  PolicyEvaluationContext,
  PolicyEvaluationResult,
  PolicyRiskLevel,
} from "./policy.types.js";

const riskPriority:
  Record<
    PolicyRiskLevel,
    number
  > = {
    LOW:
      1,

    MEDIUM:
      2,

    HIGH:
      3,

    CRITICAL:
      4,
  };

const decisionPriority:
  Record<
    PolicyDecisionType,
    number
  > = {
    ALLOW:
      1,

    REQUIRE_APPROVAL:
      2,

    DENY:
      3,
  };

function mapToolTypeToCapability(
  toolType: ToolType,
): ExecutionCapability {
  switch (
    toolType
  ) {
    case "web_search":
      return "WEB_SEARCH";

    case "browser":
      return "BROWSER";

    case "file":
      return "FILE_ACCESS";

    case "api":
      return "EXTERNAL_API";

    case "code":
      return "CODE_EXECUTION";

    case "document_parser":
      return "DOCUMENT_PARSING";
  }
}

function createCapabilityAssessment(
  capability: ExecutionCapability,
  tool?: Tool,
): CapabilityAssessment {
  const rule =
    defaultCapabilityPolicies[
      capability
    ];

  return {
    capability,

    riskLevel:
      rule.riskLevel,

    decision:
      rule.decision,

    reason:
      rule.reason,

    toolId:
      tool?.id,

    toolName:
      tool?.name,

    toolType:
      tool?.type,
  };
}

function createDisabledToolAssessment(
  tool: Tool,
): CapabilityAssessment {
  return {
    capability:
      mapToolTypeToCapability(
        tool.type,
      ),

    riskLevel:
      "CRITICAL",

    decision:
      "DENY",

    reason:
      `"${tool.name}" Tool은 현재 비활성화되어 있습니다.`,

    toolId:
      tool.id,

    toolName:
      tool.name,

    toolType:
      tool.type,
  };
}

function getToolAssessment(
  toolId: string,
  tools: Tool[],
): CapabilityAssessment {
  const tool =
    tools.find(
      (candidate) =>
        candidate.id ===
        toolId,
    );

  if (!tool) {
    return {
      ...createCapabilityAssessment(
        "UNKNOWN_TOOL",
      ),

      toolId,
    };
  }

  if (
    !tool.enabled
  ) {
    return createDisabledToolAssessment(
      tool,
    );
  }

  const capability =
    mapToolTypeToCapability(
      tool.type,
    );

  return createCapabilityAssessment(
    capability,
    tool,
  );
}

function getNodeCapabilities(
  node: WorkflowNode,
  tools: Tool[],
): CapabilityAssessment[] {
  const capabilities:
    CapabilityAssessment[] = [];

  /*
   * Agent Node 자체는 AI Model 실행 Capability를 가진다.
   */
  if (
    node.type ===
    "agent"
  ) {
    capabilities.push(
      createCapabilityAssessment(
        "AI_MODEL",
      ),
    );
  }

  /*
   * 명시적인 Approval Node.
   */
  if (
    node.type ===
      "approval" ||
    node.config
      ?.requireApproval ===
      true
  ) {
    capabilities.push(
      createCapabilityAssessment(
        "HUMAN_APPROVAL",
      ),
    );
  }

  /*
   * Node에 연결된 Tool들을 각각 평가한다.
   */
  const toolIds =
    node.toolIds ??
    [];

  for (
    const toolId
    of toolIds
  ) {
    capabilities.push(
      getToolAssessment(
        toolId,
        tools,
      ),
    );
  }

  return capabilities;
}

function getHighestRiskLevel(
  capabilities:
    CapabilityAssessment[],
): PolicyRiskLevel {
  if (
    capabilities.length ===
    0
  ) {
    return "LOW";
  }

  let highest:
    PolicyRiskLevel =
      "LOW";

  for (
    const capability
    of capabilities
  ) {
    if (
      riskPriority[
        capability.riskLevel
      ] >
      riskPriority[
        highest
      ]
    ) {
      highest =
        capability.riskLevel;
    }
  }

  return highest;
}

function getFinalDecision(
  capabilities:
    CapabilityAssessment[],
): PolicyDecisionType {
  if (
    capabilities.length ===
    0
  ) {
    return "ALLOW";
  }

  let finalDecision:
    PolicyDecisionType =
      "ALLOW";

  for (
    const capability
    of capabilities
  ) {
    if (
      decisionPriority[
        capability.decision
      ] >
      decisionPriority[
        finalDecision
      ]
    ) {
      finalDecision =
        capability.decision;
    }
  }

  return finalDecision;
}

/*
 * STEP 49
 *
 * Workflow Node가 실제로 실행되기 전에
 * 필요한 Capability를 분석하고
 * 실행 허용 여부를 결정한다.
 *
 * Policy Engine은 Node를 직접 실행하지 않는다.
 *
 * 반환값:
 *
 * ALLOW
 * → Orchestrator가 자동 실행
 *
 * REQUIRE_APPROVAL
 * → Human Approval 상태로 전환
 *
 * DENY
 * → 실행 차단
 */
export function evaluateExecutionPolicy(
  context: PolicyEvaluationContext,
): PolicyEvaluationResult {
  const {
    node,
    tools,
  } =
    context;

  const capabilities =
    getNodeCapabilities(
      node,
      tools,
    );

  const decision =
    getFinalDecision(
      capabilities,
    );

  const riskLevel =
    getHighestRiskLevel(
      capabilities,
    );

  return {
    decision,

    riskLevel,

    nodeId:
      node.id,

    nodeName:
      node.name,

    capabilities,

    reasons:
      capabilities.map(
        (
          capability,
        ) =>
          capability.reason,
      ),

    requiresApproval:
      decision ===
      "REQUIRE_APPROVAL",

    denied:
      decision ===
      "DENY",
  };
}

export function canExecuteWithoutApproval(
  node: WorkflowNode,
  tools: Tool[],
) {
  return (
    evaluateExecutionPolicy({
      node,

      tools,
    }).decision ===
    "ALLOW"
  );
}