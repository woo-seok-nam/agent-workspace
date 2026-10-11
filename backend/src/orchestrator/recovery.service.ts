import {
  editRun,
  editStepRun,
  getRuns,
} from "../modules/runs/run.service.js";

import type {
  ExecutionLog,
  WorkflowRun,
} from "../modules/runs/run.types.js";

export interface WorkflowRecoveryResult {
  inspectedRuns: number;

  recoveredRuns: number;

  recoveredSteps: number;

  failedRunIds: string[];
}

interface RecoverRunOptions {
  stepLogMessage: string;
}

function createRecoveryLog(
  message: string,
): ExecutionLog {
  return {
    id:
      `log-${crypto.randomUUID()}`,

    timestamp:
      new Date().toISOString(),

    level:
      "warning",

    message,
  };
}

async function recoverRun(
  run: WorkflowRun,
  options: RecoverRunOptions,
) {
  let recoveredSteps =
    0;

  for (
    const stepRun
    of run.stepRuns
  ) {
    if (
      stepRun.status !==
        "RUNNING" &&
      stepRun.status !==
        "QUEUED"
    ) {
      continue;
    }

    await editStepRun(
      run.id,
      stepRun.nodeId,
      {
        status:
          "PENDING",

        startedAt:
          null,

        completedAt:
          null,

        logs: [
          ...stepRun.logs,

          createRecoveryLog(
            options.stepLogMessage,
          ),
        ],
      },
    );

    recoveredSteps +=
      1;
  }

  await editRun(
    run.id,
    {
      status:
        "PAUSED",

      completedAt:
        null,
    },
  );

  return recoveredSteps;
}

async function recoverRunningWorkflowRuns(
  stepLogMessage: string,
): Promise<WorkflowRecoveryResult> {
  const runs =
    await getRuns();

  const result:
    WorkflowRecoveryResult = {
      inspectedRuns:
        runs.length,

      recoveredRuns:
        0,

      recoveredSteps:
        0,

      failedRunIds:
        [],
    };

  const runningRuns =
    runs.filter(
      (run) =>
        run.status ===
        "RUNNING",
    );

  for (
    const run
    of runningRuns
  ) {
    try {
      const recoveredStepCount =
        await recoverRun(
          run,
          {
            stepLogMessage,
          },
        );

      result.recoveredRuns +=
        1;

      result.recoveredSteps +=
        recoveredStepCount;
    } catch (
      error
    ) {
      result.failedRunIds.push(
        run.id,
      );

      console.error(
        `[Recovery] Run 복구 실패: ${run.id}`,
        error,
      );
    }
  }

  return result;
}

export async function recoverInterruptedWorkflowRuns():
Promise<WorkflowRecoveryResult> {
  return recoverRunningWorkflowRuns(
    "Backend 서버 재시작이 감지되어 실행 중이던 Step을 복구했습니다. Workflow를 Resume하면 이 Step부터 다시 실행합니다.",
  );
}

export async function checkpointRunningWorkflowRuns():
Promise<WorkflowRecoveryResult> {
  return recoverRunningWorkflowRuns(
    "Backend 서버 종료가 감지되어 실행 중이던 Step을 Checkpoint 상태로 저장했습니다. Workflow를 Resume하면 이 Step부터 다시 실행합니다.",
  );
}