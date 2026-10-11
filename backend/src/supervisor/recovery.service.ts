import type {
  StepRun,
  WorkflowRunState,
} from "../modules/runs/run.types.js";

import type {
  RecoveryDecision,
  StepRecoveryRecord,
  SupervisorRecoveryState,
} from "./recovery.types.js";

const SUPERVISOR_STATE_KEY =
  "__supervisor";

const DEFAULT_MAX_RECOVERY_ATTEMPTS =
  2;

function isRecord(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  );
}

function parseRecoveryRecord(
  value: unknown,
): StepRecoveryRecord {
  if (
    !isRecord(
      value,
    )
  ) {
    return {
      attempts:
        0,
    };
  }

  const rawAttempts =
    value.attempts;

  const attempts =
    typeof rawAttempts ===
      "number" &&
    Number.isFinite(
      rawAttempts,
    )
      ? Math.max(
          0,
          Math.floor(
            rawAttempts,
          ),
        )
      : 0;

  const lastAttemptAt =
    typeof value.lastAttemptAt ===
    "string"
      ? value.lastAttemptAt
      : undefined;

  const lastFailureMessage =
    typeof value.lastFailureMessage ===
    "string"
      ? value.lastFailureMessage
      : undefined;

  return {
    attempts,

    lastAttemptAt,

    lastFailureMessage,
  };
}

export function getSupervisorRecoveryState(
  state: WorkflowRunState,
): SupervisorRecoveryState {
  const rawSupervisor =
    state[
      SUPERVISOR_STATE_KEY
    ];

  if (
    !isRecord(
      rawSupervisor,
    )
  ) {
    return {
      steps:
        {},
    };
  }

  const rawRecovery =
    rawSupervisor.recovery;

  if (
    !isRecord(
      rawRecovery,
    )
  ) {
    return {
      steps:
        {},
    };
  }

  const rawSteps =
    rawRecovery.steps;

  if (
    !isRecord(
      rawSteps,
    )
  ) {
    return {
      steps:
        {},
    };
  }

  const steps:
    Record<
      string,
      StepRecoveryRecord
    > = {};

  for (
    const [
      nodeId,
      rawRecord,
    ]
    of Object.entries(
      rawSteps,
    )
  ) {
    steps[
      nodeId
    ] =
      parseRecoveryRecord(
        rawRecord,
      );
  }

  return {
    steps,
  };
}

export function getStepRecoveryRecord(
  state: WorkflowRunState,
  nodeId: string,
): StepRecoveryRecord {
  const recoveryState =
    getSupervisorRecoveryState(
      state,
    );

  return (
    recoveryState.steps[
      nodeId
    ] ?? {
      attempts:
        0,
    }
  );
}

export function buildNextRecoveryState(
  state: WorkflowRunState,
  nodeId: string,
  failureMessage?: string,
): SupervisorRecoveryState {
  const currentState =
    getSupervisorRecoveryState(
      state,
    );

  const currentRecord =
    currentState.steps[
      nodeId
    ] ?? {
      attempts:
        0,
    };

  return {
    steps: {
      ...currentState.steps,

      [nodeId]: {
        attempts:
          currentRecord.attempts +
          1,

        lastAttemptAt:
          new Date().toISOString(),

        lastFailureMessage:
          failureMessage,
      },
    },
  };
}

export function buildSupervisorStateValue(
  state: WorkflowRunState,
  recoveryState:
    SupervisorRecoveryState,
) {
  const rawSupervisor =
    state[
      SUPERVISOR_STATE_KEY
    ];

  const currentSupervisor =
    isRecord(
      rawSupervisor,
    )
      ? rawSupervisor
      : {};

  return {
    ...currentSupervisor,

    recovery:
      recoveryState,
  };
}

function getLastFailureMessage(
  stepRun: StepRun,
) {
  for (
    let index =
      stepRun.logs.length -
      1;
    index >=
    0;
    index -=
      1
  ) {
    const log =
      stepRun.logs[
        index
      ];

    if (
      !log ||
      log.level !==
        "error"
    ) {
      continue;
    }

    return log.message;
  }

  return undefined;
}

/*
 * STEP 47
 *
 * 현재는 실패한 Step에 대해
 * Workflow 수준 Recovery를 일정 횟수까지 허용한다.
 *
 * Agent 내부 Retry와 달리,
 * 이 판단은 해당 Node가 최종 FAILED 상태가 된 뒤
 * Supervisor 단계에서 수행된다.
 */
export function evaluateStepRecovery(
  stepRun: StepRun,
  state: WorkflowRunState,
  maxAttempts:
    number =
      DEFAULT_MAX_RECOVERY_ATTEMPTS,
): RecoveryDecision {
  const record =
    getStepRecoveryRecord(
      state,
      stepRun.nodeId,
    );

  const normalizedMaxAttempts =
    Math.max(
      0,
      Math.floor(
        maxAttempts,
      ),
    );

  const nextAttempt =
    record.attempts +
    1;

  if (
    record.attempts >=
    normalizedMaxAttempts
  ) {
    return {
      recoverable:
        false,

      strategy:
        "FAIL_RUN",

      nodeId:
        stepRun.nodeId,

      attempt:
        record.attempts,

      maxAttempts:
        normalizedMaxAttempts,

      message:
        `Supervisor Recovery 최대 횟수(${normalizedMaxAttempts}회)를 모두 사용했습니다.`,
    };
  }

  const failureMessage =
    getLastFailureMessage(
      stepRun,
    );

  return {
    recoverable:
      true,

    strategy:
      "RETRY_STEP",

    nodeId:
      stepRun.nodeId,

    attempt:
      nextAttempt,

    maxAttempts:
      normalizedMaxAttempts,

    message:
      failureMessage
        ? `실패 원인 "${failureMessage}"에 대해 Supervisor Recovery ${nextAttempt}/${normalizedMaxAttempts}회를 수행합니다.`
        : `Supervisor Recovery ${nextAttempt}/${normalizedMaxAttempts}회를 수행합니다.`,
  };
}

export {
  SUPERVISOR_STATE_KEY,
};