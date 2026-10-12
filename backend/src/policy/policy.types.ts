import type {
  Tool,
  ToolType,
} from "../modules/tools/tool.types.js";

import type {
  WorkflowNode,
} from "../modules/workflows/workflow.types.js";

export type PolicyDecisionType =
  | "ALLOW"
  | "REQUIRE_APPROVAL"
  | "DENY";

export type PolicyRiskLevel =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

export type ExecutionCapability =
  | "AI_MODEL"
  | "WEB_SEARCH"
  | "BROWSER"
  | "FILE_ACCESS"
  | "EXTERNAL_API"
  | "CODE_EXECUTION"
  | "DOCUMENT_PARSING"
  | "HUMAN_APPROVAL"
  | "UNKNOWN_TOOL";

export interface CapabilityAssessment {
  capability: ExecutionCapability;

  riskLevel: PolicyRiskLevel;

  decision: PolicyDecisionType;

  reason: string;

  toolId?: string;

  toolName?: string;

  toolType?: ToolType;
}

export interface PolicyEvaluationContext {
  node: WorkflowNode;

  tools: Tool[];
}

export interface PolicyEvaluationResult {
  decision: PolicyDecisionType;

  riskLevel: PolicyRiskLevel;

  nodeId: string;

  nodeName: string;

  capabilities: CapabilityAssessment[];

  reasons: string[];

  requiresApproval: boolean;

  denied: boolean;
}

export interface CapabilityPolicyRule {
  capability: ExecutionCapability;

  riskLevel: PolicyRiskLevel;

  decision: PolicyDecisionType;

  reason: string;
}