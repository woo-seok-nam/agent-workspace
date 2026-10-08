export type WorkflowRunStatus =
  | "IDLE"
  | "QUEUED"
  | "RUNNING"
  | "PAUSED"
  | "WAITING_APPROVAL"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type StepRunStatus =
  | "PENDING"
  | "QUEUED"
  | "RUNNING"
  | "WAITING_APPROVAL"
  | "COMPLETED"
  | "FAILED"
  | "SKIPPED"
  | "CANCELLED";

export interface ExecutionLog {
  id: string;

  timestamp: string;

  level: "info" | "warning" | "error";

  message: string;
}

export interface StepRun {
  id: string;

  runId: string;

  nodeId: string;

  status: StepRunStatus;

  startedAt?: string;

  completedAt?: string;

  input?: unknown;

  output?: unknown;

  tokenUsage?: number;

  cost?: number;

  logs: ExecutionLog[];
}

export interface WorkflowRun {
  id: string;

  workflowId: string;

  name: string;

  status: WorkflowRunStatus;

  startedAt?: string;

  completedAt?: string;

  stepRuns: StepRun[];

  tokenUsage: number;

  cost: number;
}


export type ApprovalStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

export interface Approval {
  id: string;

  runId: string;

  stepRunId: string;

  status: ApprovalStatus;

  message?: string;

  createdAt: string;

  resolvedAt?: string;
}