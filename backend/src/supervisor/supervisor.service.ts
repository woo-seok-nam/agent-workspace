import type {
  StepRun,
  WorkflowRun,
} from "../modules/runs/run.types.js";

import {
  evaluateStepRecovery,
} from "./recovery.service.js";

import type {
  SupervisorContext,
  SupervisorDecision,
  SupervisorStepSummary,
} from "./supervisor.types.js";

function summarizeSteps(
  stepRuns: StepRun[],
): SupervisorStepSummary {
  return {
    failedSteps:
      stepRuns.filter(
        (stepRun) =>
          stepRun.status ===
          "FAILED",
      ),

    runningSteps:
      stepRuns.filter(
        (stepRun) =>
          stepRun.status ===
            "RUNNING" ||
          stepRun.status ===
            "QUEUED",
      ),

    pendingSteps:
      stepRuns.filter(
        (stepRun) =>
          stepRun.status ===
          "PENDING",
      ),

    waitingApprovalSteps:
      stepRuns.filter(
        (stepRun) =>
          stepRun.status ===
          "WAITING_APPROVAL",
      ),

    completedSteps:
      stepRuns.filter(
        (stepRun) =>
          stepRun.status ===
          "COMPLETED",
      ),

    skippedSteps:
      stepRuns.filter(
        (stepRun) =>
          stepRun.status ===
          "SKIPPED",
      ),

    cancelledSteps:
      stepRuns.filter(
        (stepRun) =>
          stepRun.status ===
          "CANCELLED",
      ),
  };
}

function getStepIds(
  stepRuns: StepRun[],
) {
  return stepRuns.map(
    (stepRun) =>
      stepRun.nodeId,
  );
}

function createDecision(
  run: WorkflowRun,
  summary: SupervisorStepSummary,
  input: {
    action:
      SupervisorDecision["action"];

    reason:
      SupervisorDecision["reason"];

    message: string;

    recoveryNodeId?: string;

    recoveryAttempt?: number;

    recoveryMaxAttempts?: number;
  },
): SupervisorDecision {
  return {
    action:
      input.action,

    reason:
      input.reason,

    message:
      input.message,

    runId:
      run.id,

    timestamp:
      new Date().toISOString(),

    failedStepIds:
      getStepIds(
        summary.failedSteps,
      ),

    runningStepIds:
      getStepIds(
        summary.runningSteps,
      ),

    pendingStepIds:
      getStepIds(
        summary.pendingSteps,
      ),

    waitingApprovalStepIds:
      getStepIds(
        summary.waitingApprovalSteps,
      ),

    recoveryNodeId:
      input.recoveryNodeId,

    recoveryAttempt:
      input.recoveryAttempt,

    recoveryMaxAttempts:
      input.recoveryMaxAttempts,
  };
}

export function evaluateWorkflowRun(
  context: SupervisorContext,
): SupervisorDecision {
  const {
    run,
  } =
    context;

  const summary =
    summarizeSteps(
      run.stepRuns,
    );

  if (
    run.status ===
    "COMPLETED"
  ) {
    return createDecision(
      run,
      summary,
      {
        action:
          "STOP",

        reason:
          "RUN_COMPLETED",

        message:
          "Workflow Run이 이미 완료되었습니다.",
      },
    );
  }

  if (
    run.status ===
    "FAILED"
  ) {
    return createDecision(
      run,
      summary,
      {
        action:
          "STOP",

        reason:
          "RUN_FAILED",

        message:
          "Workflow Run이 이미 실패 상태입니다.",
      },
    );
  }

  if (
    run.status ===
    "CANCELLED"
  ) {
    return createDecision(
      run,
      summary,
      {
        action:
          "STOP",

        reason:
          "RUN_CANCELLED",

        message:
          "Workflow Run이 취소되었습니다.",
      },
    );
  }

  if (
    run.status ===
    "PAUSED"
  ) {
    return createDecision(
      run,
      summary,
      {
        action:
          "WAIT",

        reason:
          "RUN_PAUSED",

        message:
          "Workflow Run이 일시정지되어 있습니다.",
      },
    );
  }

  if (
    run.status ===
      "WAITING_APPROVAL" ||
    summary.waitingApprovalSteps.length >
      0
  ) {
    return createDecision(
      run,
      summary,
      {
        action:
          "WAIT",

        reason:
          run.status ===
            "WAITING_APPROVAL"
            ? "RUN_WAITING_APPROVAL"
            : "STEP_WAITING_APPROVAL",

        message:
          "사용자 승인이 필요한 Step이 있습니다.",
      },
    );
  }

  /*
   * STEP 47
   *
   * 실패한 Step이 있다면 바로 FAIL하지 않고
   * 먼저 Supervisor Recovery 정책을 평가한다.
   *
   * 여러 Step이 동시에 실패했다면
   * 한 번에 하나씩 Recovery한다.
   *
   * 해당 Step을 PENDING으로 되돌린 뒤
   * 다음 Supervisor loop에서 나머지 실패 Step도
   * 순차적으로 평가한다.
   */
  if (
    summary.failedSteps.length >
    0
  ) {
    const failedStep =
      summary.failedSteps[0];

    if (
      failedStep
    ) {
      const recoveryDecision =
        evaluateStepRecovery(
          failedStep,
          run.state,
        );

      if (
        recoveryDecision.recoverable
      ) {
        return createDecision(
          run,
          summary,
          {
            action:
              "RECOVER",

            reason:
              "STEP_FAILED_RECOVERABLE",

            message:
              recoveryDecision.message,

            recoveryNodeId:
              recoveryDecision.nodeId,

            recoveryAttempt:
              recoveryDecision.attempt,

            recoveryMaxAttempts:
              recoveryDecision.maxAttempts,
          },
        );
      }

      return createDecision(
        run,
        summary,
        {
          action:
            "FAIL",

          reason:
            "STEP_FAILED_EXHAUSTED",

          message:
            recoveryDecision.message,

          recoveryNodeId:
            recoveryDecision.nodeId,

          recoveryAttempt:
            recoveryDecision.attempt,

          recoveryMaxAttempts:
            recoveryDecision.maxAttempts,
        },
      );
    }
  }

  if (
    summary.runningSteps.length >
    0
  ) {
    return createDecision(
      run,
      summary,
      {
        action:
          "WAIT",

        reason:
          "STEP_RUNNING",

        message:
          `${summary.runningSteps.length}개의 Step이 실행 중입니다.`,
      },
    );
  }

  if (
    summary.pendingSteps.length >
    0
  ) {
    return createDecision(
      run,
      summary,
      {
        action:
          "CONTINUE",

        reason:
          "STEP_PENDING",

        message:
          `${summary.pendingSteps.length}개의 실행 대기 Step이 있습니다.`,
      },
    );
  }

  return createDecision(
    run,
    summary,
    {
      action:
        "COMPLETE",

      reason:
        "ALL_STEPS_FINISHED",

      message:
        "모든 Workflow Step의 실행이 종료되었습니다.",
    },
  );
}

export function superviseRun(
  run: WorkflowRun,
) {
  return evaluateWorkflowRun({
    run,
  });
}