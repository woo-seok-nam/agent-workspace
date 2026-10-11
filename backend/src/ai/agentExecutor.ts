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
  AIExecutionInput,
  AIExecutionResult,
} from "./ai.types.js";

export async function executeAgent(
  input: AIExecutionInput,
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