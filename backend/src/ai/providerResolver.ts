import type {
  AIProvider,
} from "./ai.types.js";

export function resolveProvider(
  modelId: string,
): AIProvider {
  const normalizedModelId =
    modelId
      .trim()
      .toLowerCase();

  if (
    normalizedModelId.startsWith(
      "gemini-",
    )
  ) {
    return "google";
  }

  if (
    normalizedModelId.startsWith(
      "gpt-",
    ) ||
    normalizedModelId.startsWith(
      "o1",
    ) ||
    normalizedModelId.startsWith(
      "o3",
    ) ||
    normalizedModelId.startsWith(
      "o4",
    )
  ) {
    return "openai";
  }

  throw new Error(
    `지원하지 않는 Model ID입니다: ${modelId}. 현재 OpenAI와 Gemini 모델만 지원합니다.`,
  );
}