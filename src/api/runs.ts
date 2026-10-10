import type {
  WorkflowRun,
} from "../features/runs/types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  "http://localhost:4000";

interface ApiResponse<T> {
  data: T;
}

export interface CreateRunInput {
  workflowId: string;

  name?: string;

  prompt?: string;
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
      "Run 목록을 불러오지 못했습니다.",
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
      "Run 정보를 불러오지 못했습니다.",
    );
  }

  const result =
    (await response.json()) as ApiResponse<
      WorkflowRun
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
      "Workflow Run 생성에 실패했습니다.",
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
      "Workflow 실행 시작에 실패했습니다.",
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
      "Step 승인에 실패했습니다.",
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
      "Step 거절에 실패했습니다.",
    );
  }

  const result =
    (await response.json()) as ApiResponse<
      WorkflowRun
    >;

  return result.data;
}