import OpenAI from "openai";

import type {
  AIExecutionInput,
  AIExecutionResult,
} from "../ai.types.js";

let client:
  | OpenAI
  | undefined;

function getOpenAIClient() {
  const apiKey =
    process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY가 설정되어 있지 않습니다.",
    );
  }

  if (!client) {
    client =
      new OpenAI({
        apiKey,
      });
  }

  return client;
}

export async function executeOpenAI(
  input: AIExecutionInput,
): Promise<AIExecutionResult> {
  const openai =
    getOpenAIClient();

  const response =
    await openai.responses.create({
      model:
        input.modelId,

      instructions:
        input.systemPrompt,

      input:
        input.userPrompt,

      temperature:
        normalizeTemperature(
          input.temperature,
        ),

      max_output_tokens:
        normalizeMaxTokens(
          input.maxTokens,
        ),
    });

  const text =
    response.output_text?.trim();

  if (!text) {
    throw new Error(
      `OpenAI 모델 ${input.modelId}이 텍스트 결과를 반환하지 않았습니다.`,
    );
  }

  const inputTokens =
    response.usage?.input_tokens ??
    0;

  const outputTokens =
    response.usage?.output_tokens ??
    0;

  const tokenUsage =
    response.usage?.total_tokens ??
    inputTokens +
      outputTokens;

  return {
    text,

    provider:
      "openai",

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