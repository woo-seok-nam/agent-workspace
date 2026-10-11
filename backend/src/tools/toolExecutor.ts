import {
  executeWebSearch,
} from "./executors/webSearch.executor.js";

import type {
  ToolExecutionResult,
} from "./tool.types.js";

interface ExecuteToolInput {
  toolId: string;

  query: string;
}

export async function executeTool(
  input: ExecuteToolInput,
): Promise<ToolExecutionResult> {
  const startedAt =
    new Date().toISOString();

  switch (
    input.toolId
  ) {
    case "web-search": {
      const output =
        await executeWebSearch(
          input.query,
        );

      return {
        toolId:
          input.toolId,

        toolName:
          "Web Search",

        status:
          "SUCCESS",

        output,

        startedAt,

        completedAt:
          new Date().toISOString(),
      };
    }

    default:
      throw new Error(
        `아직 실행을 지원하지 않는 Tool입니다: ${input.toolId}`,
      );
  }
}