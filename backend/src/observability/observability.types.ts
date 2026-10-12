import type {
  ApprovalStatus,
  ExecutionLog,
  StepRunStatus,
  WorkflowRunStatus,
} from "../modules/runs/run.types.js";

import type {
  WorkflowNodeType,
} from "../modules/workflows/workflow.types.js";

export type TracePolicyDecision =
  | "ALLOW"
  | "REQUIRE_APPROVAL"
  | "DENY"
  | "UNKNOWN";

export type TraceRiskLevel =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL"
  | "UNKNOWN";

export interface ExecutionTraceTool {
  id: string;

  name: string;

  type: string;

  enabled: boolean;
}

export interface ExecutionTraceAgent {
  id: string;

  name: string;

  modelId: string;
}

export interface ExecutionTraceStep {
  stepRunId: string;

  nodeId: string;

  nodeName: string;

  nodeType: WorkflowNodeType;

  status: StepRunStatus;

  approvalStatus?: ApprovalStatus;

  startedAt?: string;

  completedAt?: string;

  durationMs?: number;

  agent?: ExecutionTraceAgent;

  tools: ExecutionTraceTool[];

  retryCount: number;

  recoveryCount: number;

  policyDecision: TracePolicyDecision;

  riskLevel: TraceRiskLevel;

  tokenUsage: number;

  cost: number;

  logs: ExecutionLog[];
}

export interface ExecutionTraceSummary {
  totalSteps: number;

  completedSteps: number;

  failedSteps: number;

  skippedSteps: number;

  waitingApprovalSteps: number;

  retryCount: number;

  recoveryCount: number;

  tokenUsage: number;

  cost: number;

  durationMs?: number;
}

export interface WorkflowExecutionTrace {
  runId: string;

  workflowId: string;

  runName: string;

  workflowName: string;

  prompt?: string;

  status: WorkflowRunStatus;

  startedAt?: string;

  completedAt?: string;

  durationMs?: number;

  summary: ExecutionTraceSummary;

  steps: ExecutionTraceStep[];
}