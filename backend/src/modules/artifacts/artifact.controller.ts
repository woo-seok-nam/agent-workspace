import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  getRunArtifacts,
} from "./artifact.service.js";

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

export async function listRunArtifacts(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const runId =
      getParamValue(
        request.params.runId,
      );

    if (!runId) {
      response.status(400).json({
        error: {
          code:
            "INVALID_RUN_ID",

          message:
            "Run ID가 필요합니다.",
        },
      });

      return;
    }

    const artifacts =
      await getRunArtifacts(
        runId,
      );

    response.status(200).json({
      data:
        artifacts,
    });
  } catch (error) {
    next(error);
  }
}