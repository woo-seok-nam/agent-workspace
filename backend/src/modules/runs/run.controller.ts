import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  approveWorkflowStep,
  continueWorkflowRun,
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

export async function pauseRunController(
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

    if (
      run.status ===
      "PAUSED"
    ) {
      response.status(200).json({
        data:
          run,
      });

      return;
    }

    if (
      run.status !==
      "RUNNING"
    ) {
      response.status(409).json({
        error: {
          code:
            "RUN_CANNOT_BE_PAUSED",

          message:
            `현재 상태(${run.status})에서는 Run을 일시정지할 수 없습니다.`,
        },
      });

      return;
    }

    const updatedRun =
      await editRun(
        runId,
        {
          status:
            "PAUSED",
        },
      );

    if (!updatedRun) {
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
        updatedRun,
    });
  } catch (error) {
    next(error);
  }
}

export async function resumeRunController(
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

    if (
      run.status !==
      "PAUSED"
    ) {
      response.status(409).json({
        error: {
          code:
            "RUN_CANNOT_BE_RESUMED",

          message:
            `현재 상태(${run.status})에서는 Run을 재개할 수 없습니다.`,
        },
      });

      return;
    }

    const resumedRun =
      await editRun(
        runId,
        {
          status:
            "RUNNING",

          completedAt:
            null,
        },
      );

    if (!resumedRun) {
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

    await continueWorkflowRun(
      runId,
    );

    const updatedRun =
      await getRun(
        runId,
      );

    if (!updatedRun) {
      response.status(404).json({
        error: {
          code:
            "RUN_NOT_FOUND",

          message:
            "재개된 Run을 불러오지 못했습니다.",
        },
      });

      return;
    }

    response.status(200).json({
      data:
        updatedRun,
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelRunController(
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

    if (
      run.status ===
      "CANCELLED"
    ) {
      response.status(200).json({
        data:
          run,
      });

      return;
    }

    if (
      run.status ===
        "COMPLETED" ||
      run.status ===
        "FAILED"
    ) {
      response.status(409).json({
        error: {
          code:
            "RUN_CANNOT_BE_CANCELLED",

          message:
            `현재 상태(${run.status})에서는 Run을 취소할 수 없습니다.`,
        },
      });

      return;
    }

    const now =
      new Date().toISOString();

    /*
     * 아직 완료되지 않은 Step들을 CANCELLED 처리한다.
     *
     * 실행 중 Provider 요청 자체를 강제로 중단하는 것은
     * 현재 단계에서 하지 않는다.
     *
     * 대신 Provider 호출이 끝난 뒤 Orchestrator가
     * Run 상태를 다시 확인하고 결과를 폐기하도록
     * 다음 작업에서 연결한다.
     */
    await Promise.all(
      run.stepRuns
        .filter(
          (stepRun) =>
            stepRun.status ===
              "PENDING" ||
            stepRun.status ===
              "QUEUED" ||
            stepRun.status ===
              "RUNNING" ||
            stepRun.status ===
              "WAITING_APPROVAL",
        )
        .map(
          async (
            stepRun,
          ) => {
            await editStepRun(
              runId,
              stepRun.nodeId,
              {
                status:
                  "CANCELLED",

                completedAt:
                  now,

                logs: [
                  ...stepRun.logs,

                  {
                    id:
                      `log-${crypto.randomUUID()}`,

                    timestamp:
                      now,

                    level:
                      "warning",

                    message:
                      "사용자가 Workflow Run을 취소했습니다.",
                  },
                ],
              },
            );
          },
        ),
    );

    const updatedRun =
      await editRun(
        runId,
        {
          status:
            "CANCELLED",

          completedAt:
            now,
        },
      );

    if (!updatedRun) {
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
        updatedRun,
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