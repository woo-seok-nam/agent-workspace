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

export interface ExecutionLog {
  id: string;

  timestamp: string;

  level:
    | "info"
    | "warning"
    | "error";

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

  tokenUsage?: number;

  cost?: number;

  logs: ExecutionLog[];
}

export interface WorkflowRun {
  id: string;

  workflowId: string;

  name: string;

  /*
   * 사용자가 Run을 생성할 때 입력한 원본 Prompt.
   *
   * Workspace Result에서 사용자 요청을 다시
   * 보여주기 위해 사용한다.
   */
  prompt?: string;

  status: WorkflowRunStatus;

  startedAt?: string;

  completedAt?: string;

  stepRuns: StepRun[];

  tokenUsage: number;

  cost: number;

  createdAt?: string;

  updatedAt?: string;
}

export interface Approval {
  id: string;

  runId: string;

  stepRunId: string;

  status: ApprovalStatus;

  message?: string;

  createdAt: string;

  resolvedAt?: string;
}