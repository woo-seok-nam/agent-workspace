import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
} from "react-router-dom";

import type {
  Workflow,
} from "../features/workflow/types";

import type {
  WorkflowRun,
} from "../features/runs/types";

import {
  fetchRun,
} from "../api/runs";

import {
  fetchWorkflow,
} from "../api/workflows";

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

export function WorkflowRuntimePage() {
  const {
    runId,
  } =
    useParams();

  const [
    run,
    setRun,
  ] =
    useState<
      WorkflowRun | null
    >(null);

  const [
    workflow,
    setWorkflow,
  ] =
    useState<
      Workflow | null
    >(null);

  const [
    selectedNodeId,
    setSelectedNodeId,
  ] =
    useState<
      string | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    approvalOpen,
    setApprovalOpen,
  ] =
    useState(false);

  useEffect(() => {
    if (!runId) {
      setError(
        "Run ID가 없습니다.",
      );

      setLoading(false);

      return;
    }

    const currentRunId =
      runId;

    let cancelled =
      false;

    async function loadInitialRuntime() {
      try {
        setLoading(true);
        setError(null);

        const runData =
          await fetchRun(
            currentRunId,
          );

        const workflowData =
          await fetchWorkflow(
            runData.workflowId,
          );

        if (cancelled) {
          return;
        }

        setRun(
          runData,
        );

        setWorkflow(
          workflowData,
        );

        const firstStepRun =
          runData.stepRuns[0];

        if (firstStepRun) {
          setSelectedNodeId(
            firstStepRun.nodeId,
          );
        }
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Runtime 정보를 불러오지 못했습니다.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInitialRuntime();

    return () => {
      cancelled =
        true;
    };
  }, [
    runId,
  ]);

  useEffect(() => {
    if (
      !runId ||
      !run
    ) {
      return;
    }

    const terminalStatuses =
      new Set([
        "COMPLETED",
        "FAILED",
        "CANCELLED",
      ]);

    if (
      terminalStatuses.has(
        run.status,
      )
    ) {
      return;
    }

    const intervalId =
      window.setInterval(
        () => {
          void fetchRun(
            runId,
          )
            .then(
              (
                updatedRun,
              ) => {
                setRun(
                  updatedRun,
                );
              },
            )
            .catch(
              () => {
                // 일시적인 polling 오류는
                // 화면 전체 오류로 전환하지 않는다.
              },
            );
        },
        1000,
      );

    return () => {
      window.clearInterval(
        intervalId,
      );
    };
  }, [
    runId,
    run?.status,
  ]);

  const selectedNode =
    useMemo(() => {
      if (
        !workflow ||
        !selectedNodeId
      ) {
        return undefined;
      }

      return workflow.nodes.find(
        (node) =>
          node.id ===
          selectedNodeId,
      );
    }, [
      workflow,
      selectedNodeId,
    ]);

  const selectedStepRun =
    useMemo(() => {
      if (
        !run ||
        !selectedNodeId
      ) {
        return undefined;
      }

      return run.stepRuns.find(
        (stepRun) =>
          stepRun.nodeId ===
          selectedNodeId,
      );
    }, [
      run,
      selectedNodeId,
    ]);

  const completedSteps =
    run?.stepRuns.filter(
      (stepRun) =>
        stepRun.status ===
        "COMPLETED",
    ).length ??
    0;

  const totalSteps =
    run?.stepRuns.length ??
    0;

  const approvalStep =
    useMemo(() => {
      if (!run) {
        return undefined;
      }

      return run.stepRuns.find(
        (stepRun) =>
          stepRun.status ===
          "WAITING_APPROVAL",
      );
    }, [
      run,
    ]);

  useEffect(() => {
    setApprovalOpen(
      Boolean(
        approvalStep,
      ),
    );
  }, [
    approvalStep,
  ]);

  if (loading) {
    return (
      <div className="workflow-runtime-page">
        Runtime 정보를 불러오는 중입니다...
      </div>
    );
  }

  if (error) {
    return (
      <div className="workflow-runtime-page">
        <h1>
          Workflow Runtime
        </h1>

        <p>
          {error}
        </p>
      </div>
    );
  }

  if (
    !run ||
    !workflow
  ) {
    return (
      <div className="workflow-runtime-page">
        Runtime 정보를 찾을 수 없습니다.
      </div>
    );
  }

  const approvalNode =
    approvalStep
      ? workflow.nodes.find(
          (node) =>
            node.id ===
            approvalStep.nodeId,
        )
      : undefined;

  return (
    <div className="workflow-runtime-page">
      <RunHeader
        name={
          run.name
        }
        workflowName={
          workflow.name
        }
        status={
          run.status
        }
      />

      <RunProgress
        completedSteps={
          completedSteps
        }
        totalSteps={
          totalSteps
        }
      />

      <div className="runtime-layout">
        <ExecutionTimeline
          nodes={
            workflow.nodes
          }
          stepRuns={
            run.stepRuns
          }
          selectedNodeId={
            selectedNodeId ??
            undefined
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

      <ApprovalModal
        open={
          approvalOpen
        }
        stepName={
          approvalNode?.name ??
          "Approval Required"
        }
        agentName={
          approvalNode?.agentId
        }
        summary="이 Step은 사용자 승인이 필요합니다."
        onApprove={() => {
          setApprovalOpen(
            false,
          );
        }}
        onReject={() => {
          setApprovalOpen(
            false,
          );
        }}
        onClose={() => {
          setApprovalOpen(
            false,
          );
        }}
      />
    </div>
  );
}