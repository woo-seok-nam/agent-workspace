import {
  executeGoogle,
} from "./providers/google.provider.js";

import {
  executeOpenAI,
} from "./providers/openai.provider.js";

import {
  resolveProvider,
} from "./providerResolver.js";

import type {
  AIExecutionResult,
} from "./ai.types.js";

interface ExecuteAgentInput {
  modelId: string;

  systemPrompt: string;

  userPrompt: string;
}

export async function executeAgent(
  input: ExecuteAgentInput,
): Promise<AIExecutionResult> {
  const provider =
    resolveProvider(
      input.modelId,
    );

  switch (provider) {
    case "openai":
      return executeOpenAI(
        input,
      );

    case "google":
      return executeGoogle(
        input,
      );
  }
}