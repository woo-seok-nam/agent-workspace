import {
  GoogleGenAI,
} from "@google/genai";

import type {
  AIExecutionInput,
  AIExecutionResult,
} from "../ai.types.js";

let client:
  | GoogleGenAI
  | undefined;

function getGoogleClient() {
  const apiKey =
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY가 설정되어 있지 않습니다.",
    );
  }

  if (!client) {
    client =
      new GoogleGenAI({
        apiKey,
      });
  }

  return client;
}

export async function executeGoogle(
  input: AIExecutionInput,
): Promise<AIExecutionResult> {
  const google =
    getGoogleClient();

  const response =
    await google.models.generateContent({
      model:
        input.modelId,

      contents:
        input.userPrompt,

      config: {
        systemInstruction:
          input.systemPrompt,

        temperature:
          normalizeTemperature(
            input.temperature,
          ),

        maxOutputTokens:
          normalizeMaxTokens(
            input.maxTokens,
          ),
      },
    });

  const text =
    response.text?.trim();

  if (!text) {
    throw new Error(
      `Gemini 모델 ${input.modelId}이 텍스트 결과를 반환하지 않았습니다.`,
    );
  }

  const inputTokens =
    response.usageMetadata
      ?.promptTokenCount ??
    0;

  const outputTokens =
    response.usageMetadata
      ?.candidatesTokenCount ??
    0;

  const tokenUsage =
    response.usageMetadata
      ?.totalTokenCount ??
    inputTokens +
      outputTokens;

  return {
    text,

    provider:
      "google",

    modelId:
      input.modelId,

    inputTokens,

    outputTokens,

    tokenUsage,

    cost:
      0,
  };
}

function normalizeTemperature(
  temperature:
    | number
    | undefined,
) {
  if (
    temperature ===
    undefined
  ) {
    return undefined;
  }

  if (
    !Number.isFinite(
      temperature,
    )
  ) {
    return undefined;
  }

  return Math.min(
    2,
    Math.max(
      0,
      temperature,
    ),
  );
}

function normalizeMaxTokens(
  maxTokens:
    | number
    | undefined,
) {
  if (
    maxTokens ===
    undefined
  ) {
    return undefined;
  }

  if (
    !Number.isFinite(
      maxTokens,
    )
  ) {
    return undefined;
  }

  const normalized =
    Math.floor(
      maxTokens,
    );

  if (
    normalized <=
    0
  ) {
    return undefined;
  }

  return normalized;
}