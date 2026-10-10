import type {
  ProviderConfig,
} from "../features/tools/types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  "http://localhost:4000";

interface ApiResponse<T> {
  data: T;
}

export async function fetchProviders(): Promise<
  ProviderConfig[]
> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/providers`,
    );

  if (!response.ok) {
    throw new Error(
      "Provider 목록을 불러오지 못했습니다.",
    );
  }

  const result =
    (await response.json()) as ApiResponse<
      ProviderConfig[]
    >;

  return result.data;
}

export async function updateProvider(
  providerId: ProviderConfig["id"],
  input: Partial<
    Pick<
      ProviderConfig,
      | "enabled"
      | "connectionStatus"
    >
  >,
): Promise<ProviderConfig> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/providers/${providerId}`,
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
      "Provider 수정에 실패했습니다.",
    );
  }

  const result =
    (await response.json()) as ApiResponse<
      ProviderConfig
    >;

  return result.data;
}