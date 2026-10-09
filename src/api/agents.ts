import type {
  Agent,
} from "../features/agents/types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  "http://localhost:4000";

interface ApiResponse<T> {
  data: T;
}

export async function fetchAgents(): Promise<
  Agent[]
> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/agents`,
    );

  if (!response.ok) {
    throw new Error(
      "Agent 목록을 불러오지 못했습니다.",
    );
  }

  const result =
    (await response.json()) as ApiResponse<
      Agent[]
    >;

  return result.data;
}

export async function fetchAgent(
  agentId: string,
): Promise<Agent> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/agents/${agentId}`,
    );

  if (!response.ok) {
    throw new Error(
      "Agent 정보를 불러오지 못했습니다.",
    );
  }

  const result =
    (await response.json()) as ApiResponse<
      Agent
    >;

  return result.data;
}

export async function createAgent(
  input: {
    name: string;

    description?: string;

    modelId: string;

    toolIds: string[];

    enabled: boolean;
  },
): Promise<Agent> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/agents`,
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
      "Agent 생성에 실패했습니다.",
    );
  }

  const result =
    (await response.json()) as ApiResponse<
      Agent
    >;

  return result.data;
}

export async function updateAgent(
  agentId: string,
  input: Partial<
    Pick<
      Agent,
      | "name"
      | "description"
      | "modelId"
      | "toolIds"
      | "enabled"
    >
  >,
): Promise<Agent> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/agents/${agentId}`,
      {
        method: "PATCH",

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
      "Agent 수정에 실패했습니다.",
    );
  }

  const result =
    (await response.json()) as ApiResponse<
      Agent
    >;

  return result.data;
}

export async function deleteAgent(
  agentId: string,
): Promise<void> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/agents/${agentId}`,
      {
        method:
          "DELETE",
      },
    );

  if (!response.ok) {
    throw new Error(
      "Agent 삭제에 실패했습니다.",
    );
  }
}