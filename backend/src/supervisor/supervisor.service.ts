import type {
  StepRun,
  WorkflowRun,
} from "../modules/runs/run.types.js";

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
  };
}

/*
 * STEP 46
 *
 * Supervisor는 직접 Node를 실행하지 않는다.
 *
 * 역할은 현재 Workflow Run의 상태를 관찰하고,
 * Orchestrator가 다음에 무엇을 해야 하는지
 * 결정하는 것이다.
 *
 * 현재 Supervisor는 deterministic rule 기반이다.
 *
 * STEP 47 이후:
 * - Failure Recovery
 * - Retry 전략 변경
 * - Replanning
 *
 * 같은 판단을 여기에서 확장할 수 있다.
 */
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

  /*
   * 이미 종료된 Run은 더 이상
   * Orchestrator가 실행하면 안 된다.
   */
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

  /*
   * Pause 상태에서는 실행을 진행하지 않는다.
   *
   * Resume 요청이 들어오면 Run 상태가 RUNNING으로
   * 변경되고 다시 Supervisor 평가를 받는다.
   */
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

  /*
   * Human Approval 대기 상태.
   *
   * Supervisor가 승인 여부를 결정하지 않는다.
   * 사용자의 입력을 기다린다.
   */
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
   * Step 하나라도 FAILED라면
   * 현재 기본 정책에서는 Run 실패 후보가 된다.
   *
   * STEP 47에서는 이 지점에서 바로 FAIL하지 않고
   * Recovery / Replanning을 시도하게 확장한다.
   */
  if (
    summary.failedSteps.length >
    0
  ) {
    return createDecision(
      run,
      summary,
      {
        action:
          "FAIL",

        reason:
          "STEP_FAILED",

        message:
          `${summary.failedSteps.length}개의 Step이 실패했습니다.`,
      },
    );
  }

  /*
   * 현재 실행 중인 Step이 있다면
   * 해당 실행이 끝날 때까지 기다린다.
   */
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

  /*
   * 실행 가능한지 여부는 DAG Graph Engine이 결정한다.
   *
   * Supervisor는 PENDING Step이 존재한다는 사실만 보고
   * Orchestrator가 다음 실행 후보를 계산하도록 CONTINUE 한다.
   */
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

  /*
   * Pending / Running / Failed / Approval Step이 없으면
   * 실행해야 할 작업이 모두 끝난 것이다.
   *
   * COMPLETED와 SKIPPED의 조합도 정상 종료로 본다.
   */
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

/*
 * 편의 함수.
 *
 * 이후 Orchestrator에서:
 *
 * const decision = superviseRun(run);
 *
 * 형태로 간단히 호출하기 위해 제공한다.
 */
export function superviseRun(
  run: WorkflowRun,
) {
  return evaluateWorkflowRun({
    run,
  });
}