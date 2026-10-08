import {
  useMemo,
  useState,
} from "react";

import {
  useParams,
} from "react-router-dom";

import {
  mockRuns,
} from "../mocks/runs";

import {
  mockWorkflows,
} from "../mocks/workflows";

import type {
  StepRun,
  WorkflowRunStatus,
} from "../features/runs/types";

import {
  RunHeader,
} from "../features/runs/components/RunHeader";

import {
  RunProgress,
} from "../features/runs/components/RunProgress";

import {
  ExecutionTimeline,
} from "../features/runs/components/ExecutionTimeline";

import {
  StepExecutionPanel,
} from "../features/runs/components/StepExecutionPanel";

import "../features/runs/WorkflowRuntime.css";

const previewStepRuns: StepRun[] = [
  {
    id: "preview-step-planner",
    runId: "run-preview",
    nodeId: "planner",
    status: "COMPLETED",
    startedAt:
      "2026-10-08T06:00:00Z",
    completedAt:
      "2026-10-08T06:00:12Z",
    tokenUsage: 620,
    cost: 0.01,
    logs: [
      {
        id: "planner-log-1",
        timestamp:
          "2026-10-08T06:00:01Z",
        level: "info",
        message:
          "사용자 요청을 분석합니다.",
      },
      {
        id: "planner-log-2",
        timestamp:
          "2026-10-08T06:00:12Z",
        level: "info",
        message:
          "작업 계획 생성이 완료되었습니다.",
      },
    ],
  },

  {
    id: "preview-step-web",
    runId: "run-preview",
    nodeId: "web-research",
    status: "COMPLETED",
    startedAt:
      "2026-10-08T06:00:13Z",
    completedAt:
      "2026-10-08T06:02:28Z",
    tokenUsage: 3100,
    cost: 0.05,
    logs: [
      {
        id: "web-log-1",
        timestamp:
          "2026-10-08T06:00:14Z",
        level: "info",
        message:
          "웹 검색을 시작합니다.",
      },
      {
        id: "web-log-2",
        timestamp:
          "2026-10-08T06:02:28Z",
        level: "info",
        message:
          "웹 자료 수집이 완료되었습니다.",
      },
    ],
  },

  {
    id: "preview-step-document",
    runId: "run-preview",
    nodeId: "document-research",
    status: "COMPLETED",
    startedAt:
      "2026-10-08T06:00:13Z",
    completedAt:
      "2026-10-08T06:01:58Z",
    tokenUsage: 2110,
    cost: 0.04,
    logs: [
      {
        id: "document-log-1",
        timestamp:
          "2026-10-08T06:00:15Z",
        level: "info",
        message:
          "문서 분석을 시작합니다.",
      },
      {
        id: "document-log-2",
        timestamp:
          "2026-10-08T06:01:58Z",
        level: "info",
        message:
          "문서 분석을 완료했습니다.",
      },
    ],
  },

  {
    id: "preview-step-analysis",
    runId: "run-preview",
    nodeId: "analysis",
    status: "RUNNING",
    startedAt:
      "2026-10-08T06:02:29Z",
    tokenUsage: 1240,
    cost: 0.02,
    logs: [
      {
        id: "analysis-log-1",
        timestamp:
          "2026-10-08T06:02:29Z",
        level: "info",
        message:
          "수집된 자료를 분석합니다.",
      },
      {
        id: "analysis-log-2",
        timestamp:
          "2026-10-08T06:02:34Z",
        level: "info",
        message:
          "주요 인사이트를 추출하고 있습니다.",
      },
    ],
  },

  {
    id: "preview-step-writer",
    runId: "run-preview",
    nodeId: "writer",
    status: "PENDING",
    tokenUsage: 0,
    cost: 0,
    logs: [],
  },

  {
    id: "preview-step-reviewer",
    runId: "run-preview",
    nodeId: "reviewer",
    status: "PENDING",
    tokenUsage: 0,
    cost: 0,
    logs: [],
  },
];

export function WorkflowRuntimePage() {
  const {
    runId,
  } = useParams();

  const storedRun =
    mockRuns.find(
      (run) =>
        run.id === runId,
    );

  const workflow =
    mockWorkflows.find(
      (item) =>
        item.id ===
        (
          storedRun?.workflowId ??
          "workflow-research-report"
        ),
    );

  const [
    status,
    setStatus,
  ] =
    useState<WorkflowRunStatus>(
      storedRun?.status ??
        "RUNNING",
    );

  const stepRuns =
    runId === "run-preview"
      ? previewStepRuns
      : storedRun?.stepRuns ??
        previewStepRuns;

  const executableNodes =
    useMemo(
      () =>
        workflow?.nodes.filter(
          (node) =>
            node.type !== "input" &&
            node.type !== "output",
        ) ?? [],
      [workflow],
    );

  const defaultSelected =
    stepRuns.find(
      (stepRun) =>
        stepRun.status ===
        "RUNNING",
    )?.nodeId ??
    executableNodes[0]?.id ??
    null;

  const [
    selectedNodeId,
    setSelectedNodeId,
  ] =
    useState<string | null>(
      defaultSelected,
    );

  if (!workflow) {
    return (
      <div>
        Workflow를 찾을 수 없습니다.
      </div>
    );
  }

  const selectedNode =
    workflow.nodes.find(
      (node) =>
        node.id ===
        selectedNodeId,
    );

  const selectedStepRun =
    stepRuns.find(
      (stepRun) =>
        stepRun.nodeId ===
        selectedNodeId,
    );

  const completedSteps =
    stepRuns.filter(
      (stepRun) =>
        stepRun.status ===
        "COMPLETED",
    ).length;

  const runName =
    storedRun?.name ??
    "경쟁사 비교 분석 보고서";

  return (
    <div className="workflow-runtime-page">
      <RunHeader
        name={runName}
        workflowName={
          workflow.name
        }
        status={status}
        onPause={() => {
          setStatus(
            "PAUSED",
          );
        }}
        onResume={() => {
          setStatus(
            "RUNNING",
          );
        }}
        onStop={() => {
          const confirmed =
            window.confirm(
              "Workflow 실행을 중지하시겠습니까?",
            );

          if (confirmed) {
            setStatus(
              "CANCELLED",
            );
          }
        }}
      />

      <RunProgress
        completedSteps={
          completedSteps
        }
        totalSteps={
          executableNodes.length
        }
      />

      <div className="runtime-layout">
        <ExecutionTimeline
          nodes={
            workflow.nodes
          }
          stepRuns={
            stepRuns
          }
          selectedNodeId={
            selectedNodeId
          }
          onSelect={
            setSelectedNodeId
          }
        />

        <StepExecutionPanel
          node={
            selectedNode
          }
          stepRun={
            selectedStepRun
          }
        />
      </div>
    </div>
  );
}