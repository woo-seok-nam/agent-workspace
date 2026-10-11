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