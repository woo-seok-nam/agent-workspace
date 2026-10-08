import type { WorkflowRun } from "../features/runs/types";

export const mockRuns: WorkflowRun[] = [
  {
    id: "run-001",
    workflowId: "workflow-research-report",

    name: "경쟁사 비교 분석 보고서",

    status: "COMPLETED",

    startedAt: "2026-10-08T09:00:00Z",
    completedAt: "2026-10-08T09:08:24Z",

    tokenUsage: 12450,
    cost: 0.21,

    stepRuns: [],
  },

  {
    id: "run-002",
    workflowId: "workflow-code-review",

    name: "프로젝트 코드 리뷰",

    status: "RUNNING",

    startedAt: "2026-10-08T10:00:00Z",

    tokenUsage: 4200,
    cost: 0.08,

    stepRuns: [],
  },

  {
    id: "run-003",
    workflowId: "workflow-data-analysis",

    name: "데이터 분석 대시보드",

    status: "FAILED",

    startedAt: "2026-10-07T16:00:00Z",
    completedAt: "2026-10-07T16:04:10Z",

    tokenUsage: 2810,
    cost: 0.04,

    stepRuns: [],
  },
];