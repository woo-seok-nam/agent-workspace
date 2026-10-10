import type {
  Tool,
} from "../features/tools/types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  "http://localhost:4000";

interface ApiResponse<T> {
  data: T;
}

export async function fetchTools(): Promise<
  Tool[]
> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/tools`,
    );

  if (!response.ok) {
    throw new Error(
      "Tool 목록을 불러오지 못했습니다.",
    );
  }

  const result =
    (await response.json()) as ApiResponse<
      Tool[]
    >;

  return result.data;
}

export async function updateTool(
  toolId: string,
  input: Partial<
    Pick<
      Tool,
      | "name"
      | "description"
      | "enabled"
    >
  >,
): Promise<Tool> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/tools/${toolId}`,
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
      "Tool 수정에 실패했습니다.",
    );
  }

  const result =
    (await response.json()) as ApiResponse<
      Tool
    >;

  return result.data;
}