import type {
  Workflow,
  WorkflowNode,
} from "../modules/workflows/workflow.types.js";

import type {
  WorkflowRun,
} from "../modules/runs/run.types.js";

export interface OrchestratorContext {
  workflow: Workflow;

  run: WorkflowRun;
}

export interface NodeExecutionContext {
  workflow: Workflow;

  run: WorkflowRun;

  node: WorkflowNode;

  dependencyOutputs: Record<
    string,
    unknown
  >;
}

export interface NodeExecutionResult {
  output: unknown;

  tokenUsage: number;

  cost: number;
}