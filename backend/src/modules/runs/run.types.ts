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

export type ApprovalStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

export type ExecutionLogLevel =
  | "info"
  | "warning"
  | "error";

export type WorkflowRunState =
  Record<
    string,
    unknown
  >;

export interface ExecutionLog {
  id: string;

  timestamp: string;

  level: ExecutionLogLevel;

  message: string;
}

export interface StepRun {
  id: string;

  runId: string;

  nodeId: string;

  status: StepRunStatus;

  approvalStatus?: ApprovalStatus;

  startedAt?: string;

  completedAt?: string;

  input?: unknown;

  output?: unknown;

  tokenUsage: number;

  cost: number;

  logs: ExecutionLog[];
}

export interface WorkflowRun {
  id: string;

  workflowId: string;

  name: string;

  prompt?: string;

  status: WorkflowRunStatus;

  state: WorkflowRunState;

  startedAt?: string;

  completedAt?: string;

  stepRuns: StepRun[];

  tokenUsage: number;

  cost: number;

  createdAt: string;

  updatedAt: string;
}

export interface CreateWorkflowRunInput {
  workflowId: string;

  name?: string;

  prompt?: string;

  state?: WorkflowRunState;
}

export interface UpdateWorkflowRunInput {
  status?: WorkflowRunStatus;

  state?: WorkflowRunState;

  startedAt?: string | null;

  completedAt?: string | null;

  tokenUsage?: number;

  cost?: number;
}

export interface UpdateStepRunInput {
  status?: StepRunStatus;

  approvalStatus?:
    | ApprovalStatus
    | null;

  input?: unknown;

  output?: unknown;

  logs?: ExecutionLog[];

  tokenUsage?: number;

  cost?: number;

  startedAt?: string | null;

  completedAt?: string | null;
}