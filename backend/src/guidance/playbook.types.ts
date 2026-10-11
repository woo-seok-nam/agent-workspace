export type PlaybookCategory =
  | "RESEARCH"
  | "ANALYSIS"
  | "WRITING"
  | "PLANNING"
  | "REVIEW"
  | "AUTOMATION"
  | "GENERAL";

export type PlaybookNodeType =
  | "input"
  | "agent"
  | "tool"
  | "condition"
  | "approval"
  | "output";

export interface PlaybookStep {
  id: string;

  name: string;

  description: string;

  type: PlaybookNodeType;

  role?: string;

  suggestedTools?: string[];

  requireApproval?: boolean;
}

export interface PlaybookEdge {
  source: string;

  target: string;
}

export interface WorkflowPlaybook {
  id: string;

  name: string;

  description: string;

  category: PlaybookCategory;

  keywords: string[];

  examples: string[];

  steps: PlaybookStep[];

  edges: PlaybookEdge[];

  enabled: boolean;

  priority: number;
}

export interface PlaybookMatch {
  playbook: WorkflowPlaybook;

  score: number;

  matchedKeywords: string[];

  reasons: string[];
}

export interface GuidanceRecommendation {
  goal: string;

  recommendedPlaybook:
    WorkflowPlaybook | null;

  alternatives: PlaybookMatch[];

  confidence: number;

  reasons: string[];
}