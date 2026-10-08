import type { Workflow } from "../features/workflow/types";

export const mockWorkflows: Workflow[] = [
  {
    id: "workflow-research-report",
    name: "Research & Report",
    description:
      "자료 조사, 분석, 보고서 작성까지 수행하는 워크플로우입니다.",

    nodes: [
      {
        id: "input",
        type: "input",
        name: "User Input",
        position: { x: 300, y: 0 },
      },
      {
        id: "planner",
        type: "agent",
        name: "Planner",
        position: { x: 300, y: 120 },
        agentId: "planner-agent",
        modelId: "gpt-4o",
      },
      {
        id: "web-research",
        type: "agent",
        name: "Web Research",
        position: { x: 160, y: 240 },
        agentId: "research-agent",
        modelId: "claude-3-5-sonnet",
        toolIds: ["web-search", "browser"],
      },
      {
        id: "document-research",
        type: "agent",
        name: "Document Research",
        position: { x: 440, y: 240 },
        agentId: "research-agent",
        modelId: "claude-3-5-sonnet",
        toolIds: ["document-parser"],
      },
      {
        id: "analysis",
        type: "agent",
        name: "Analysis",
        position: { x: 300, y: 360 },
        agentId: "analysis-agent",
        modelId: "claude-3-5-sonnet",
      },
      {
        id: "writer",
        type: "agent",
        name: "Writer",
        position: { x: 300, y: 480 },
        agentId: "writer-agent",
        modelId: "gpt-4o",
        config: {
          requireApproval: true,
        },
      },
      {
        id: "reviewer",
        type: "agent",
        name: "Reviewer",
        position: { x: 300, y: 600 },
        agentId: "reviewer-agent",
        modelId: "claude-3-5-sonnet",
      },
      {
        id: "output",
        type: "output",
        name: "Output",
        position: { x: 300, y: 720 },
      },
    ],

    edges: [
      {
        id: "e1",
        source: "input",
        target: "planner",
      },
      {
        id: "e2",
        source: "planner",
        target: "web-research",
      },
      {
        id: "e3",
        source: "planner",
        target: "document-research",
      },
      {
        id: "e4",
        source: "web-research",
        target: "analysis",
      },
      {
        id: "e5",
        source: "document-research",
        target: "analysis",
      },
      {
        id: "e6",
        source: "analysis",
        target: "writer",
      },
      {
        id: "e7",
        source: "writer",
        target: "reviewer",
      },
      {
        id: "e8",
        source: "reviewer",
        target: "output",
      },
    ],

    createdAt: "2026-10-08T00:00:00Z",
    updatedAt: "2026-10-08T00:00:00Z",
  },

  {
    id: "workflow-code-review",
    name: "Code Review",
    description: "코드를 분석하고 문제점과 개선 사항을 검토합니다.",

    nodes: [
      {
        id: "input",
        type: "input",
        name: "Code Input",
        position: { x: 300, y: 0 },
      },
      {
        id: "analysis",
        type: "agent",
        name: "Code Analysis",
        position: { x: 300, y: 150 },
        agentId: "analysis-agent",
        modelId: "gpt-4o",
        toolIds: ["code-execution"],
      },
      {
        id: "review",
        type: "agent",
        name: "Review",
        position: { x: 300, y: 300 },
        agentId: "reviewer-agent",
        modelId: "claude-3-5-sonnet",
      },
      {
        id: "output",
        type: "output",
        name: "Review Result",
        position: { x: 300, y: 450 },
      },
    ],

    edges: [
      {
        id: "e1",
        source: "input",
        target: "analysis",
      },
      {
        id: "e2",
        source: "analysis",
        target: "review",
      },
      {
        id: "e3",
        source: "review",
        target: "output",
      },
    ],

    createdAt: "2026-10-08T00:00:00Z",
    updatedAt: "2026-10-08T00:00:00Z",
  },

  {
    id: "workflow-data-analysis",
    name: "Data Analysis",
    description: "데이터를 분석하고 주요 인사이트를 도출합니다.",

    nodes: [
      {
        id: "input",
        type: "input",
        name: "Data Input",
        position: { x: 300, y: 0 },
      },
      {
        id: "analysis",
        type: "agent",
        name: "Data Analysis",
        position: { x: 300, y: 180 },
        agentId: "analysis-agent",
        modelId: "claude-3-5-sonnet",
        toolIds: ["code-execution"],
      },
      {
        id: "output",
        type: "output",
        name: "Analysis Result",
        position: { x: 300, y: 360 },
      },
    ],

    edges: [
      {
        id: "e1",
        source: "input",
        target: "analysis",
      },
      {
        id: "e2",
        source: "analysis",
        target: "output",
      },
    ],

    createdAt: "2026-10-08T00:00:00Z",
    updatedAt: "2026-10-08T00:00:00Z",
  },

  {
    id: "workflow-document-summary",
    name: "Document Summary",
    description: "문서를 분석하고 핵심 내용을 요약합니다.",

    nodes: [
      {
        id: "input",
        type: "input",
        name: "Document Input",
        position: { x: 300, y: 0 },
      },
      {
        id: "summary",
        type: "agent",
        name: "Document Summary",
        position: { x: 300, y: 180 },
        agentId: "writer-agent",
        modelId: "gpt-4o",
        toolIds: ["document-parser"],
      },
      {
        id: "output",
        type: "output",
        name: "Summary",
        position: { x: 300, y: 360 },
      },
    ],

    edges: [
      {
        id: "e1",
        source: "input",
        target: "summary",
      },
      {
        id: "e2",
        source: "summary",
        target: "output",
      },
    ],

    createdAt: "2026-10-08T00:00:00Z",
    updatedAt: "2026-10-08T00:00:00Z",
  },
];