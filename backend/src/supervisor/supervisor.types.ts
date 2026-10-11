import type {
  StepRun,
  WorkflowRun,
} from "../modules/runs/run.types.js";

export type SupervisorAction =
  | "CONTINUE"
  | "WAIT"
  | "COMPLETE"
  | "FAIL"
  | "STOP";

export type SupervisorReason =
  | "RUN_ACTIVE"
  | "RUN_PAUSED"
  | "RUN_WAITING_APPROVAL"
  | "RUN_COMPLETED"
  | "RUN_FAILED"
  | "RUN_CANCELLED"
  | "STEP_FAILED"
  | "STEP_WAITING_APPROVAL"
  | "STEP_RUNNING"
  | "STEP_PENDING"
  | "ALL_STEPS_FINISHED";

export interface SupervisorDecision {
  action: SupervisorAction;

  reason: SupervisorReason;

  message: string;

  runId: string;

  timestamp: string;

  failedStepIds: string[];

  runningStepIds: string[];

  pendingStepIds: string[];

  waitingApprovalStepIds: string[];
}

export interface SupervisorContext {
  run: WorkflowRun;
}

export interface SupervisorStepSummary {
  failedSteps: StepRun[];

  runningSteps: StepRun[];

  pendingSteps: StepRun[];

  waitingApprovalSteps: StepRun[];

  completedSteps: StepRun[];

  skippedSteps: StepRun[];

  cancelledSteps: StepRun[];
}