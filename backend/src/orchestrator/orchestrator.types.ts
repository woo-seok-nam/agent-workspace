import type {
  Workflow,
  WorkflowNode,
} from "../modules/workflows/workflow.types.js";

import type {
  WorkflowRun,
  WorkflowRunState,
} from "../modules/runs/run.types.js";

export interface OrchestratorContext {
  workflow: Workflow;

  run: WorkflowRun;

  sharedState:
    WorkflowRunState;
}

export interface NodeExecutionContext {
  workflow: Workflow;

  run: WorkflowRun;

  node: WorkflowNode;

  dependencyOutputs: Record<
    string,
    unknown
  >;

  sharedState:
    WorkflowRunState;
}

export interface NodeExecutionResult {
  output: unknown;

  tokenUsage: number;

  cost: number;
}