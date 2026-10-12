import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  getWorkflowExecutionTrace,
} from "./observability.service.js";

function getParamValue(
  value:
    | string
    | string[]
    | undefined,
) {
  if (
    Array.isArray(
      value,
    )
  ) {
    return value[0];
  }

  return value;
}

export async function readExecutionTraceController(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const runId =
      getParamValue(
        request.params.runId,
      );

    if (
      !runId?.trim()
    ) {
      response.status(
        400,
      ).json({
        error:
          "runId는 필수입니다.",
      });

      return;
    }

    const trace =
      await getWorkflowExecutionTrace(
        runId,
      );

    response.status(
      200,
    ).json({
      data:
        trace,
    });
  } catch (error) {
    next(
      error,
    );
  }
}