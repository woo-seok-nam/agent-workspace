import type { ResultFile } from "../features/workspace/types";

export const mockResultFiles: ResultFile[] = [
  {
    id: "file-001",
    runId: "run-001",

    name: "Research_Report.md",

    mimeType: "text/markdown",

    size: 24576,

    url: "/mock-files/Research_Report.md",

    createdAt: "2026-10-08T09:08:00Z",
  },

  {
    id: "file-002",
    runId: "run-001",

    name: "summary_data.json",

    mimeType: "application/json",

    size: 10240,

    url: "/mock-files/summary_data.json",

    createdAt: "2026-10-08T09:08:05Z",
  },

  {
    id: "file-003",
    runId: "run-001",

    name: "analysis_chart.png",

    mimeType: "image/png",

    size: 184320,

    url: "/mock-files/analysis_chart.png",

    createdAt: "2026-10-08T09:08:10Z",
  },

  {
    id: "file-004",
    runId: "run-001",

    name: "execution_log.txt",

    mimeType: "text/plain",

    size: 8192,

    url: "/mock-files/execution_log.txt",

    createdAt: "2026-10-08T09:08:20Z",
  },
];