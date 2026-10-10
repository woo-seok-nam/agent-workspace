import type {
  Workflow,
} from "../features/workflow/types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  "http://localhost:4000";

interface ApiResponse<T> {
  data: T;
}

export async function fetchWorkflows(): Promise<
  Workflow[]
> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/workflows`,
    );

  if (!response.ok) {
    throw new Error(
      "Workflow 목록을 불러오지 못했습니다.",
    );
  }

  const result =
    (await response.json()) as ApiResponse<
      Workflow[]
    >;

  return result.data;
}

export async function fetchWorkflow(
  workflowId: string,
): Promise<Workflow> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/workflows/${workflowId}`,
    );

  if (!response.ok) {
    throw new Error(
      "Workflow를 불러오지 못했습니다.",
    );
  }

  const result =
    (await response.json()) as ApiResponse<
      Workflow
    >;

  return result.data;
}

export async function updateWorkflow(
  workflowId: string,
  workflow: Pick<
    Workflow,
    | "name"
    | "description"
    | "nodes"
    | "edges"
  >,
): Promise<Workflow> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/workflows/${workflowId}`,
      {
        method: "PUT",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            workflow,
          ),
      },
    );

  if (!response.ok) {
    throw new Error(
      "Workflow 저장에 실패했습니다.",
    );
  }

  const result =
    (await response.json()) as ApiResponse<
      Workflow
    >;

  return result.data;
}

export async function createWorkflow(
  input: {
    name: string;
    description?: string;
    nodes?: Workflow["nodes"];
    edges?: Workflow["edges"];
  },
): Promise<Workflow> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/workflows`,
      {
        method: "POST",

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
      "Workflow 생성에 실패했습니다.",
    );
  }

  const result =
    (await response.json()) as ApiResponse<
      Workflow
    >;

  return result.data;
}

export async function deleteWorkflow(
  workflowId: string,
): Promise<void> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/workflows/${workflowId}`,
      {
        method: "DELETE",
      },
    );

  if (!response.ok) {
    throw new Error(
      "Workflow 삭제에 실패했습니다.",
    );
  }
}