import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  approveWorkflowStep,
  rejectWorkflowStep,
  startWorkflowRun,
} from "../../orchestrator/orchestrator.service.js";

import {
  addRun,
  editRun,
  editStepRun,
  getRun,
  getRuns,
} from "./run.service.js";

import type {
  CreateWorkflowRunInput,
  UpdateStepRunInput,
  UpdateWorkflowRunInput,
} from "./run.types.js";

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

export async function listRuns(
  _request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const runs =
      await getRuns();

    response.status(200).json({
      data:
        runs,
    });
  } catch (error) {
    next(error);
  }
}

export async function readRun(
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

    const run =
      await getRun(
        runId,
      );

    if (!run) {
      response.status(404).json({
        error: {
          code:
            "RUN_NOT_FOUND",

          message:
            "Run을 찾을 수 없습니다.",
        },
      });

      return;
    }

    response.status(200).json({
      data:
        run,
    });
  } catch (error) {
    next(error);
  }
}

export async function createRunController(
  request: Request<
    Record<string, never>,
    unknown,
    CreateWorkflowRunInput
  >,
  response: Response,
  next: NextFunction,
) {
  try {
    const run =
      await addRun(
        request.body,
      );

    response.status(201).json({
      data:
        run,
    });
  } catch (error) {
    next(error);
  }
}

export async function startRunController(
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

    const run =
      await startWorkflowRun(
        runId,
      );

    response.status(200).json({
      data:
        run,
    });
  } catch (error) {
    next(error);
  }
}

export async function approveStepController(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const runId =
      getParamValue(
        request.params.runId,
      );

    const nodeId =
      getParamValue(
        request.params.nodeId,
      );

    if (
      !runId ||
      !nodeId
    ) {
      response.status(400).json({
        error: {
          code:
            "INVALID_APPROVAL_TARGET",

          message:
            "Run ID와 Node ID가 필요합니다.",
        },
      });

      return;
    }

    const run =
      await approveWorkflowStep(
        runId,
        nodeId,
      );

    response.status(200).json({
      data:
        run,
    });
  } catch (error) {
    next(error);
  }
}

export async function rejectStepController(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const runId =
      getParamValue(
        request.params.runId,
      );

    const nodeId =
      getParamValue(
        request.params.nodeId,
      );

    if (
      !runId ||
      !nodeId
    ) {
      response.status(400).json({
        error: {
          code:
            "INVALID_APPROVAL_TARGET",

          message:
            "Run ID와 Node ID가 필요합니다.",
        },
      });

      return;
    }

    const run =
      await rejectWorkflowStep(
        runId,
        nodeId,
      );

    response.status(200).json({
      data:
        run,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateRunController(
  request: Request<
    {
      runId: string;
    },
    unknown,
    UpdateWorkflowRunInput
  >,
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

    const run =
      await editRun(
        runId,
        request.body,
      );

    if (!run) {
      response.status(404).json({
        error: {
          code:
            "RUN_NOT_FOUND",

          message:
            "Run을 찾을 수 없습니다.",
        },
      });

      return;
    }

    response.status(200).json({
      data:
        run,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateStepRunController(
  request: Request<
    {
      runId: string;
      nodeId: string;
    },
    unknown,
    UpdateStepRunInput
  >,
  response: Response,
  next: NextFunction,
) {
  try {
    const runId =
      getParamValue(
        request.params.runId,
      );

    const nodeId =
      getParamValue(
        request.params.nodeId,
      );

    if (
      !runId ||
      !nodeId
    ) {
      response.status(400).json({
        error: {
          code:
            "INVALID_STEP_RUN_ID",

          message:
            "Run ID와 Node ID가 필요합니다.",
        },
      });

      return;
    }

    const stepRun =
      await editStepRun(
        runId,
        nodeId,
        request.body,
      );

    if (!stepRun) {
      response.status(404).json({
        error: {
          code:
            "STEP_RUN_NOT_FOUND",

          message:
            "StepRun을 찾을 수 없습니다.",
        },
      });

      return;
    }

    response.status(200).json({
      data:
        stepRun,
    });
  } catch (error) {
    next(error);
  }
}