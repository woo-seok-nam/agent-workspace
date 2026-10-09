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

import {
  mockAgents,
} from "../mocks/agents";

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

import {
  ApprovalModal,
} from "../features/runs/components/ApprovalModal";

import "../features/runs/WorkflowRuntime.css";

const previewStepRuns: StepRun[] = [
  {
    id: "preview-step-planner",
    runId: "run-preview",
    nodeId: "planner",
    status: "COMPLETED",
    startedAt: "2026-10-09T03:00:00Z",
    completedAt: "2026-10-09T03:00:12Z",
    tokenUsage: 620,
    cost: 0.01,
    logs: [
      {
        id: "planner-log-1",
        timestamp: "2026-10-09T03:00:01Z",
        level: "info",
        message:
          "사용자 요청을 분석합니다.",
      },
      {
        id: "planner-log-2",
        timestamp: "2026-10-09T03:00:12Z",
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
    startedAt: "2026-10-09T03:00:13Z",
    completedAt: "2026-10-09T03:02:28Z",
    tokenUsage: 3100,
    cost: 0.05,
    logs: [],
  },

  {
    id: "preview-step-document",
    runId: "run-preview",
    nodeId: "document-research",
    status: "COMPLETED",
    startedAt: "2026-10-09T03:00:13Z",
    completedAt: "2026-10-09T03:01:58Z",
    tokenUsage: 2110,
    cost: 0.04,
    logs: [],
  },

  {
    id: "preview-step-analysis",
    runId: "run-preview",
    nodeId: "analysis",
    status: "COMPLETED",
    startedAt: "2026-10-09T03:02:29Z",
    completedAt: "2026-10-09T03:03:15Z",
    tokenUsage: 1240,
    cost: 0.02,
    logs: [],
  },

  {
    id: "preview-step-writer",
    runId: "run-preview",
    nodeId: "writer",
    status: "WAITING_APPROVAL",
    startedAt: "2026-10-09T03:03:16Z",
    tokenUsage: 2050,
    cost: 0.03,
    logs: [
      {
        id: "writer-log-1",
        timestamp: "2026-10-09T03:03:16Z",
        level: "info",
        message:
          "보고서 초안을 생성합니다.",
      },
      {
        id: "writer-log-2",
        timestamp: "2026-10-09T03:04:10Z",
        level: "info",
        message:
          "보고서 초안 생성이 완료되었습니다.",
      },
      {
        id: "writer-log-3",
        timestamp: "2026-10-09T03:04:11Z",
        level: "warning",
        message:
          "사용자 승인을 기다리고 있습니다.",
      },
    ],
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
  const { runId } = useParams();

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
      runId === "run-preview"
        ? "WAITING_APPROVAL"
        : storedRun?.status ??
            "RUNNING",
    );

  const [
    stepRuns,
    setStepRuns,
  ] =
    useState<StepRun[]>(
      runId === "run-preview"
        ? previewStepRuns
        : storedRun?.stepRuns ??
            previewStepRuns,
    );

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

  const waitingApprovalStep =
    stepRuns.find(
      (stepRun) =>
        stepRun.status ===
        "WAITING_APPROVAL",
    );

  const defaultSelected =
    waitingApprovalStep?.nodeId ??
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

  const [
    approvalOpen,
    setApprovalOpen,
  ] =
    useState(
      Boolean(
        waitingApprovalStep,
      ),
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

  const approvalNode =
    waitingApprovalStep
      ? workflow.nodes.find(
          (node) =>
            node.id ===
            waitingApprovalStep.nodeId,
        )
      : undefined;

  const approvalAgent =
    approvalNode?.agentId
      ? mockAgents.find(
          (agent) =>
            agent.id ===
            approvalNode.agentId,
        )
      : undefined;

  const handleApprove = () => {
    if (!waitingApprovalStep) {
      return;
    }

    setStepRuns(
      (current) =>
        current.map(
          (stepRun) => {
            if (
              stepRun.id ===
              waitingApprovalStep.id
            ) {
              return {
                ...stepRun,

                status: "COMPLETED",

                completedAt:
                  new Date().toISOString(),

                logs: [
                  ...stepRun.logs,
                  {
                    id:
                      `log-${crypto.randomUUID()}`,

                    timestamp:
                      new Date().toISOString(),

                    level: "info",

                    message:
                      "사용자 승인이 완료되었습니다.",
                  },
                ],
              };
            }

            if (
              stepRun.nodeId ===
              "reviewer"
            ) {
              return {
                ...stepRun,

                status: "RUNNING",

                startedAt:
                  new Date().toISOString(),
              };
            }

            return stepRun;
          },
        ),
    );

    setStatus("RUNNING");

    setSelectedNodeId(
      "reviewer",
    );

    setApprovalOpen(false);
  };

  const handleReject = () => {
    if (!waitingApprovalStep) {
      return;
    }

    setStepRuns(
      (current) =>
        current.map(
          (stepRun) =>
            stepRun.id ===
            waitingApprovalStep.id
              ? {
                  ...stepRun,

                  status: "FAILED",

                  completedAt:
                    new Date().toISOString(),

                  logs: [
                    ...stepRun.logs,
                    {
                      id:
                        `log-${crypto.randomUUID()}`,

                      timestamp:
                        new Date().toISOString(),

                      level: "error",

                      message:
                        "사용자가 실행 결과를 거절했습니다.",
                    },
                  ],
                }
              : stepRun,
        ),
    );

    setStatus("FAILED");

    setApprovalOpen(false);
  };

  return (
    <>
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

      <ApprovalModal
        open={
          approvalOpen
        }
        stepName={
          approvalNode?.name ??
          "Approval Step"
        }
        agentName={
          approvalAgent?.name
        }
        summary="보고서 초안이 생성되었습니다. 내용을 검토한 뒤 다음 검토 단계로 진행할지 결정하세요."
        onApprove={
          handleApprove
        }
        onReject={
          handleReject
        }
      />
    </>
  );
}