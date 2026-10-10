import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  editTool,
  getTool,
  getTools,
} from "./tool.service.js";

import type {
  UpdateToolInput,
} from "./tool.types.js";

function getParamValue(
  value:
    | string
    | string[]
    | undefined,
): string | undefined {
  if (
    Array.isArray(value)
  ) {
    return value[0];
  }

  return value;
}

export async function listTools(
  _request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const tools =
      await getTools();

    response.status(200).json({
      data: tools,
    });
  } catch (error) {
    next(error);
  }
}

export async function readTool(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const toolId =
      getParamValue(
        request.params.toolId,
      );

    if (!toolId) {
      response.status(400).json({
        error: {
          code:
            "INVALID_TOOL_ID",

          message:
            "Tool ID가 필요합니다.",
        },
      });

      return;
    }

    const tool =
      await getTool(
        toolId,
      );

    if (!tool) {
      response.status(404).json({
        error: {
          code:
            "TOOL_NOT_FOUND",

          message:
            "Tool을 찾을 수 없습니다.",
        },
      });

      return;
    }

    response.status(200).json({
      data: tool,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateToolController(
  request: Request<
    {
      toolId: string;
    },
    unknown,
    UpdateToolInput
  >,
  response: Response,
  next: NextFunction,
) {
  try {
    const toolId =
      getParamValue(
        request.params.toolId,
      );

    if (!toolId) {
      response.status(400).json({
        error: {
          code:
            "INVALID_TOOL_ID",

          message:
            "Tool ID가 필요합니다.",
        },
      });

      return;
    }

    const tool =
      await editTool(
        toolId,
        request.body,
      );

    if (!tool) {
      response.status(404).json({
        error: {
          code:
            "TOOL_NOT_FOUND",

          message:
            "Tool을 찾을 수 없습니다.",
        },
      });

      return;
    }

    response.status(200).json({
      data: tool,
    });
  } catch (error) {
    next(error);
  }
}