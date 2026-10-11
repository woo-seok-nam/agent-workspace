import type {
  Workflow,
} from "../modules/workflows/workflow.types.js";

import type {
  GuidanceRecommendation,
  WorkflowPlaybook,
} from "./playbook.types.js";

export interface RecommendWorkflowInput {
  goal: string;
}

export interface GuidancePlaybookSummary {
  id: string;

  name: string;

  description: string;

  category: string;

  stepCount: number;
}

export interface RecommendWorkflowResult {
  recommendation:
    GuidanceRecommendation;

  selectedPlaybook:
    WorkflowPlaybook | null;

  availablePlaybooks:
    GuidancePlaybookSummary[];
}

export interface CreateGuidedWorkflowInput {
  goal: string;

  playbookId?: string;
}

export interface GuidedWorkflowAssignment {
  playbookStepId: string;

  nodeId: string;

  role?: string;

  agentId?: string;

  agentName?: string;

  modelId?: string;

  matchedToolIds: string[];

  fallbackUsed: boolean;
}

export interface CreateGuidedWorkflowResult {
  workflow: Workflow;

  playbook: WorkflowPlaybook;

  assignments:
    GuidedWorkflowAssignment[];

  warnings: string[];
}