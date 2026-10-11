export interface Artifact {
  id: string;

  runId: string;

  name: string;

  type: string;

  path: string;

  mimeType: string;

  size: number;

  createdAt: string;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  "http://localhost:4000";

interface ApiResponse<T> {
  data: T;
}

export async function fetchRunArtifacts(
  runId: string,
): Promise<Artifact[]> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/runs/${runId}/artifacts`,
    );

  if (!response.ok) {
    throw new Error(
      "Artifact 목록을 불러오지 못했습니다.",
    );
  }

  const result =
    (await response.json()) as ApiResponse<
      Artifact[]
    >;

  return result.data;
}