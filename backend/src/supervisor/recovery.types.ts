export type RecoveryStrategy =
  | "RETRY_STEP"
  | "FAIL_RUN";

export interface StepRecoveryRecord {
  attempts: number;

  lastAttemptAt?: string;

  lastFailureMessage?: string;
}

export interface SupervisorRecoveryState {
  steps: Record<
    string,
    StepRecoveryRecord
  >;
}

export interface RecoveryDecision {
  recoverable: boolean;

  strategy: RecoveryStrategy;

  nodeId: string;

  attempt: number;

  maxAttempts: number;

  message: string;
}