import {
  Router,
} from "express";

import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  deleteWorkflowRun,
} from "./runDelete.service.js";

export const runDeleteRouter =
  Router();

function getParamValue(
  value:
    | string
    | string[]
    | undefined,
): string | undefined {
  if (
    Array.isArray(
      value,
    )
  ) {
    return value[0];
  }

  return value;
}

runDeleteRouter.delete(
  "/runs/:runId",
  async (
    request: Request,
    response: Response,
    next: NextFunction,
  ) => {
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

      const result =
        await deleteWorkflowRun(
          runId,
        );

      if (!result) {
        response.status(404).json({
          error: {
            code:
              "RUN_NOT_FOUND",

            message:
              "삭제할 Run을 찾을 수 없습니다.",
          },
        });

        return;
      }

      response.status(200).json({
        data:
          result,
      });
    } catch (error) {
      next(
        error,
      );
    }
  },
);