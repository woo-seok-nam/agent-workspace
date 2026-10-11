import type {
  Workflow,
} from "../features/workflow/types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  "http://localhost:4000";

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

export interface GuidancePlaybookStep {
  id: string;

  name: string;

  description: string;

  type: PlaybookNodeType;

  role?: string;

  suggestedTools?: string[];

  requireApproval?: boolean;
}

export interface GuidancePlaybookEdge {
  source: string;

  target: string;
}

export interface GuidancePlaybook {
  id: string;

  name: string;

  description: string;

  category: PlaybookCategory;

  keywords: string[];

  examples: string[];

  steps: GuidancePlaybookStep[];

  edges: GuidancePlaybookEdge[];

  enabled: boolean;

  priority: number;
}

export interface GuidancePlaybookMatch {
  playbook: GuidancePlaybook;

  score: number;

  matchedKeywords: string[];

  reasons: string[];
}

export interface GuidanceRecommendation {
  goal: string;

  recommendedPlaybook:
    GuidancePlaybook | null;

  alternatives:
    GuidancePlaybookMatch[];

  confidence: number;

  reasons: string[];
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
    GuidancePlaybook | null;

  availablePlaybooks:
    GuidancePlaybookSummary[];
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

  playbook: GuidancePlaybook;

  assignments:
    GuidedWorkflowAssignment[];

  warnings: string[];
}

interface ApiResponse<T> {
  data: T;
}

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

function extractErrorMessage(
  value: unknown,
): string | undefined {
  if (
    typeof value ===
    "string"
  ) {
    return value;
  }

  if (
    !isRecord(
      value,
    )
  ) {
    return undefined;
  }

  if (
    typeof value.message ===
    "string"
  ) {
    return value.message;
  }

  if (
    typeof value.error ===
    "string"
  ) {
    return value.error;
  }

  if (
    isRecord(
      value.error,
    )
  ) {
    return extractErrorMessage(
      value.error,
    );
  }

  return undefined;
}

async function getApiErrorMessage(
  response: Response,
  fallback: string,
) {
  try {
    const body =
      (await response.json()) as unknown;

    return (
      extractErrorMessage(
        body,
      ) ??
      `${fallback} (HTTP ${response.status})`
    );
  } catch {
    return `${fallback} (HTTP ${response.status})`;
  }
}

export async function recommendWorkflow(
  goal: string,
): Promise<RecommendWorkflowResult> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/guidance/recommend`,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            goal,
          }),
      },
    );

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(
        response,
        "Workflow 추천을 불러오지 못했습니다.",
      ),
    );
  }

  const result =
    (await response.json()) as ApiResponse<
      RecommendWorkflowResult
    >;

  return result.data;
}

export async function createGuidedWorkflow(
  input: {
    goal: string;

    playbookId?: string;
  },
): Promise<CreateGuidedWorkflowResult> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/guidance/workflows`,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            input,
          ),
      },
    );

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(
        response,
        "추천 Workflow 생성에 실패했습니다.",
      ),
    );
  }

  const result =
    (await response.json()) as ApiResponse<
      CreateGuidedWorkflowResult
    >;

  return result.data;
}