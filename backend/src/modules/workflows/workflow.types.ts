export type WorkflowNodeType =
  | "input"
  | "agent"
  | "tool"
  | "condition"
  | "approval"
  | "output";

export interface WorkflowNodePosition {
  x: number;
  y: number;
}

export interface WorkflowNodeConfig {
  prompt?: string;
  timeoutSeconds?: number;
  retryCount?: number;
  requireApproval?: boolean;
}

export interface WorkflowCondition {
  field: string;

  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "gt"
    | "gte"
    | "lt"
    | "lte";

  value: unknown;
}

export interface WorkflowNode {
  id: string;

  type: WorkflowNodeType;

  name: string;

  description?: string;

  position: WorkflowNodePosition;

  agentId?: string;

  modelId?: string;

  toolIds?: string[];

  config?: WorkflowNodeConfig;
}

export interface WorkflowEdge {
  id: string;

  source: string;

  target: string;

  sourceHandle?: string;

  targetHandle?: string;

  condition?: WorkflowCondition;
}

export interface Workflow {
  id: string;

  name: string;

  description?: string;

  nodes: WorkflowNode[];

  edges: WorkflowEdge[];

  createdAt: string;

  updatedAt: string;
}

export interface CreateWorkflowInput {
  name: string;

  description?: string;

  nodes?: WorkflowNode[];

  edges?: WorkflowEdge[];
}

export interface UpdateWorkflowInput {
  name?: string;

  description?: string;

  nodes?: WorkflowNode[];

  edges?: WorkflowEdge[];
}