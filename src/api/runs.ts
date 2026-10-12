import type {
  WorkflowRun,
} from "../features/runs/types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  "http://localhost:4000";

interface ApiResponse<T> {
  data: T;
}

interface ApiErrorResponse {
  error?: {
    code?: string;

    message?: string;
  };
}

export interface CreateRunInput {
  workflowId: string;

  name?: string;

  prompt?: string;
}

export interface DeleteRunResult {
  runId: string;

  deleted: boolean;

  deletedArtifactFiles: number;

  failedArtifactFiles: string[];
}

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

export interface ExecutionTraceLog {
  id: string;

  timestamp: string;

  level:
    | "info"
    | "warning"
    | "error";

  message: string;
}

export interface ExecutionTraceStep {
  stepRunId: string;

  nodeId: string;

  nodeName: string;

  nodeType:
    | "input"
    | "agent"
    | "tool"
    | "condition"
    | "approval"
    | "output";

  status:
    | "PENDING"
    | "QUEUED"
    | "RUNNING"
    | "WAITING_APPROVAL"
    | "COMPLETED"
    | "FAILED"
    | "SKIPPED"
    | "CANCELLED";

  approvalStatus?:
    | "PENDING"
    | "APPROVED"
    | "REJECTED";

  startedAt?: string;

  completedAt?: string;

  durationMs?: number;

  agent?: ExecutionTraceAgent;

  tools: ExecutionTraceTool[];

  retryCount: number;

  recoveryCount: number;

  policyDecision:
    TracePolicyDecision;

  riskLevel:
    TraceRiskLevel;

  tokenUsage: number;

  cost: number;

  logs: ExecutionTraceLog[];
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

  status:
    | "IDLE"
    | "QUEUED"
    | "RUNNING"
    | "PAUSED"
    | "WAITING_APPROVAL"
    | "COMPLETED"
    | "FAILED"
    | "CANCELLED";

  startedAt?: string;

  completedAt?: string;

  durationMs?: number;

  summary:
    ExecutionTraceSummary;

  steps:
    ExecutionTraceStep[];
}

async function getApiErrorMessage(
  response: Response,
  fallbackMessage: string,
) {
  try {
    const result =
      (await response.json()) as ApiErrorResponse;

    return (
      result.error?.message ??
      fallbackMessage
    );
  } catch {
    return fallbackMessage;
  }
}

export async function fetchRuns(): Promise<
  WorkflowRun[]
> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/runs`,
    );

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(
        response,
        "Run 목록을 불러오지 못했습니다.",
      ),
    );
  }

  const result =
    (await response.json()) as ApiResponse<
      WorkflowRun[]
    >;

  return result.data;
}

export async function fetchRun(
  runId: string,
): Promise<WorkflowRun> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/runs/${runId}`,
    );

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(
        response,
        "Run 정보를 불러오지 못했습니다.",
      ),
    );
  }

  const result =
    (await response.json()) as ApiResponse<
      WorkflowRun
    >;

  return result.data;
}

export async function fetchRunTrace(
  runId: string,
): Promise<WorkflowExecutionTrace> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/runs/${runId}/trace`,
    );

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(
        response,
        "Execution Trace를 불러오지 못했습니다.",
      ),
    );
  }

  const result =
    (await response.json()) as ApiResponse<
      WorkflowExecutionTrace
    >;

  return result.data;
}

export async function createRun(
  input: CreateRunInput,
): Promise<WorkflowRun> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/runs`,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            input,
          ),
      },
    );

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(
        response,
        "Workflow Run 생성에 실패했습니다.",
      ),
    );
  }

  const result =
    (await response.json()) as ApiResponse<
      WorkflowRun
    >;

  return result.data;
}

export async function startRun(
  runId: string,
): Promise<WorkflowRun> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/runs/${runId}/start`,
      {
        method:
          "POST",
      },
    );

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(
        response,
        "Workflow 실행 시작에 실패했습니다.",
      ),
    );
  }

  const result =
    (await response.json()) as ApiResponse<
      WorkflowRun
    >;

  return result.data;
}

export async function pauseRun(
  runId: string,
): Promise<WorkflowRun> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/runs/${runId}/pause`,
      {
        method:
          "POST",
      },
    );

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(
        response,
        "Workflow Run 일시정지에 실패했습니다.",
      ),
    );
  }

  const result =
    (await response.json()) as ApiResponse<
      WorkflowRun
    >;

  return result.data;
}

export async function resumeRun(
  runId: string,
): Promise<WorkflowRun> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/runs/${runId}/resume`,
      {
        method:
          "POST",
      },
    );

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(
        response,
        "Workflow Run 재개에 실패했습니다.",
      ),
    );
  }

  const result =
    (await response.json()) as ApiResponse<
      WorkflowRun
    >;

  return result.data;
}

export async function cancelRun(
  runId: string,
): Promise<WorkflowRun> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/runs/${runId}/cancel`,
      {
        method:
          "POST",
      },
    );

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(
        response,
        "Workflow Run 취소에 실패했습니다.",
      ),
    );
  }

  const result =
    (await response.json()) as ApiResponse<
      WorkflowRun
    >;

  return result.data;
}

export async function approveRunStep(
  runId: string,
  nodeId: string,
): Promise<WorkflowRun> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/runs/${runId}/steps/${nodeId}/approve`,
      {
        method:
          "POST",
      },
    );

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(
        response,
        "Step 승인에 실패했습니다.",
      ),
    );
  }

  const result =
    (await response.json()) as ApiResponse<
      WorkflowRun
    >;

  return result.data;
}

export async function rejectRunStep(
  runId: string,
  nodeId: string,
): Promise<WorkflowRun> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/runs/${runId}/steps/${nodeId}/reject`,
      {
        method:
          "POST",
      },
    );

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(
        response,
        "Step 거절에 실패했습니다.",
      ),
    );
  }

  const result =
    (await response.json()) as ApiResponse<
      WorkflowRun
    >;

  return result.data;
}

export async function deleteRun(
  runId: string,
): Promise<DeleteRunResult> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/runs/${runId}`,
      {
        method:
          "DELETE",
      },
    );

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(
        response,
        "Run 삭제에 실패했습니다.",
      ),
    );
  }

  const result =
    (await response.json()) as ApiResponse<
      DeleteRunResult
    >;

  return result.data;
}