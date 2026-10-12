export interface Artifact {
  id: string;

  runId: string;

  name: string;

  type: string;

  mimeType: string;

  size: number;

  createdAt: string;
}

export interface ArtifactContent
  extends Artifact {
  content: string;
}

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

export async function fetchRunArtifacts(
  runId: string,
): Promise<Artifact[]> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/runs/${runId}/artifacts`,
    );

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(
        response,
        "Artifact 목록을 불러오지 못했습니다.",
      ),
    );
  }

  const result =
    (await response.json()) as ApiResponse<
      Artifact[]
    >;

  return result.data;
}

export async function fetchArtifactContent(
  artifactId: string,
): Promise<ArtifactContent> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/artifacts/${artifactId}/content`,
    );

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(
        response,
        "Artifact 내용을 불러오지 못했습니다.",
      ),
    );
  }

  const result =
    (await response.json()) as ApiResponse<
      ArtifactContent
    >;

  return result.data;
}

export function getArtifactDownloadUrl(
  artifactId: string,
) {
  return `${API_BASE_URL}/api/artifacts/${artifactId}/download`;
}