import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Pause,
  Play,
  Square,
} from "lucide-react";

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
  approveRunStep,
  cancelRun,
  fetchRun,
  pauseRun,
  rejectRunStep,
  resumeRun,
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

import {
  ExecutionTracePanel,
} from "../features/runs/components/ExecutionTracePanel";

import "../features/runs/WorkflowRuntime.css";

type RuntimeControlAction =
  | "pause"
  | "resume"
  | "cancel";

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
    useState(
      true,
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    approvalOpen,
    setApprovalOpen,
  ] =
    useState(
      false,
    );

  const [
    approvalProcessing,
    setApprovalProcessing,
  ] =
    useState(
      false,
    );

  const [
    runtimeControlAction,
    setRuntimeControlAction,
  ] =
    useState<
      RuntimeControlAction | null
    >(
      null,
    );

  const [
    runtimeControlError,
    setRuntimeControlError,
  ] =
    useState<
      string | null
    >(
      null,
    );

  useEffect(
    () => {
      if (
        !runId
      ) {
        setError(
          "Run ID가 없습니다.",
        );

        setLoading(
          false,
        );

        return;
      }

      const currentRunId =
        runId;

      let cancelled =
        false;

      async function loadInitialRuntime() {
        try {
          setLoading(
            true,
          );

          setError(
            null,
          );

          const runData =
            await fetchRun(
              currentRunId,
            );

          const workflowData =
            await fetchWorkflow(
              runData.workflowId,
            );

          if (
            cancelled
          ) {
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

          if (
            firstStepRun
          ) {
            setSelectedNodeId(
              firstStepRun.nodeId,
            );
          }
        } catch (
          loadError
        ) {
          if (
            cancelled
          ) {
            return;
          }

          setError(
            loadError instanceof Error
              ? loadError.message
              : "Runtime 정보를 불러오지 못했습니다.",
          );
        } finally {
          if (
            !cancelled
          ) {
            setLoading(
              false,
            );
          }
        }
      }

      void loadInitialRuntime();

      return () => {
        cancelled =
          true;
      };
    },
    [
      runId,
    ],
  );

  /*
   * Run 상태 polling
   *
   * terminal 상태에서는 polling 중단.
   * PAUSED / WAITING_APPROVAL 상태는
   * 이후 상태가 바뀔 수 있으므로 계속 확인한다.
   */
  useEffect(
    () => {
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
                  /*
                   * 일시적인 polling 실패는
                   * Runtime 전체 오류로 처리하지 않는다.
                   */
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
    },
    [
      runId,
      run?.status,
    ],
  );

  const selectedNode =
    useMemo(
      () => {
        if (
          !workflow ||
          !selectedNodeId
        ) {
          return undefined;
        }

        return workflow.nodes.find(
          (
            node,
          ) =>
            node.id ===
            selectedNodeId,
        );
      },
      [
        workflow,
        selectedNodeId,
      ],
    );

  const selectedStepRun =
    useMemo(
      () => {
        if (
          !run ||
          !selectedNodeId
        ) {
          return undefined;
        }

        return run.stepRuns.find(
          (
            stepRun,
          ) =>
            stepRun.nodeId ===
            selectedNodeId,
        );
      },
      [
        run,
        selectedNodeId,
      ],
    );

  const completedSteps =
    run?.stepRuns.filter(
      (
        stepRun,
      ) =>
        stepRun.status ===
        "COMPLETED",
    ).length ??
    0;

  const totalSteps =
    run?.stepRuns.length ??
    0;

  const approvalStep =
    useMemo(
      () => {
        if (
          !run
        ) {
          return undefined;
        }

        return run.stepRuns.find(
          (
            stepRun,
          ) =>
            stepRun.status ===
            "WAITING_APPROVAL",
        );
      },
      [
        run,
      ],
    );

  useEffect(
    () => {
      if (
        approvalProcessing
      ) {
        return;
      }

      setApprovalOpen(
        Boolean(
          approvalStep,
        ),
      );
    },
    [
      approvalStep,
      approvalProcessing,
    ],
  );

  const handlePause =
    async () => {
      if (
        !runId ||
        !run ||
        run.status !==
          "RUNNING" ||
        runtimeControlAction
      ) {
        return;
      }

      try {
        setRuntimeControlAction(
          "pause",
        );

        setRuntimeControlError(
          null,
        );

        const updatedRun =
          await pauseRun(
            runId,
          );

        setRun(
          updatedRun,
        );
      } catch (
        pauseError
      ) {
        setRuntimeControlError(
          pauseError instanceof Error
            ? pauseError.message
            : "Workflow 일시정지에 실패했습니다.",
        );
      } finally {
        setRuntimeControlAction(
          null,
        );
      }
    };

  const handleResume =
    async () => {
      if (
        !runId ||
        !run ||
        run.status !==
          "PAUSED" ||
        runtimeControlAction
      ) {
        return;
      }

      try {
        setRuntimeControlAction(
          "resume",
        );

        setRuntimeControlError(
          null,
        );

        const updatedRun =
          await resumeRun(
            runId,
          );

        setRun(
          updatedRun,
        );
      } catch (
        resumeError
      ) {
        setRuntimeControlError(
          resumeError instanceof Error
            ? resumeError.message
            : "Workflow 재개에 실패했습니다.",
        );
      } finally {
        setRuntimeControlAction(
          null,
        );
      }
    };

  const handleCancel =
    async () => {
      if (
        !runId ||
        !run ||
        runtimeControlAction
      ) {
        return;
      }

      const cancellableStatuses =
        new Set([
          "IDLE",
          "QUEUED",
          "RUNNING",
          "PAUSED",
          "WAITING_APPROVAL",
        ]);

      if (
        !cancellableStatuses.has(
          run.status,
        )
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          "이 Workflow 실행을 취소하시겠습니까?\n\n취소한 Run은 다시 Resume할 수 없습니다.",
        );

      if (
        !confirmed
      ) {
        return;
      }

      try {
        setRuntimeControlAction(
          "cancel",
        );

        setRuntimeControlError(
          null,
        );

        setApprovalOpen(
          false,
        );

        const updatedRun =
          await cancelRun(
            runId,
          );

        setRun(
          updatedRun,
        );
      } catch (
        cancelError
      ) {
        setRuntimeControlError(
          cancelError instanceof Error
            ? cancelError.message
            : "Workflow 취소에 실패했습니다.",
        );

        if (
          run.status ===
          "WAITING_APPROVAL"
        ) {
          setApprovalOpen(
            true,
          );
        }
      } finally {
        setRuntimeControlAction(
          null,
        );
      }
    };

  const handleApprove =
    async () => {
      if (
        !runId ||
        !approvalStep ||
        approvalProcessing ||
        runtimeControlAction
      ) {
        return;
      }

      try {
        setApprovalProcessing(
          true,
        );

        setApprovalOpen(
          false,
        );

        const updatedRun =
          await approveRunStep(
            runId,
            approvalStep.nodeId,
          );

        setRun(
          updatedRun,
        );
      } catch (
        approvalError
      ) {
        window.alert(
          approvalError instanceof Error
            ? approvalError.message
            : "승인 처리에 실패했습니다.",
        );

        setApprovalOpen(
          true,
        );
      } finally {
        setApprovalProcessing(
          false,
        );
      }
    };

  const handleReject =
    async () => {
      if (
        !runId ||
        !approvalStep ||
        approvalProcessing ||
        runtimeControlAction
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          "이 Step을 거절하면 Workflow 실행이 취소됩니다. 계속하시겠습니까?",
        );

      if (
        !confirmed
      ) {
        return;
      }

      try {
        setApprovalProcessing(
          true,
        );

        setApprovalOpen(
          false,
        );

        const updatedRun =
          await rejectRunStep(
            runId,
            approvalStep.nodeId,
          );

        setRun(
          updatedRun,
        );
      } catch (
        approvalError
      ) {
        window.alert(
          approvalError instanceof Error
            ? approvalError.message
            : "거절 처리에 실패했습니다.",
        );

        setApprovalOpen(
          true,
        );
      } finally {
        setApprovalProcessing(
          false,
        );
      }
    };

  if (
    loading
  ) {
    return (
      <div className="workflow-runtime-page">
        <div className="execution-trace__loading">
          Runtime 정보를 불러오는 중입니다...
        </div>
      </div>
    );
  }

  if (
    error
  ) {
    return (
      <div className="workflow-runtime-page">
        <header className="run-header">
          <div>
            <div className="run-header__breadcrumb">
              Runtime
            </div>

            <div className="run-header__title">
              <h1>
                Workflow Runtime
              </h1>
            </div>

            <p>
              실행 정보를 불러오는 과정에서 문제가 발생했습니다.
            </p>
          </div>
        </header>

        <div
          className="runtime-control-error"
          role="alert"
        >
          {error}
        </div>
      </div>
    );
  }

  if (
    !run ||
    !workflow
  ) {
    return (
      <div className="workflow-runtime-page">
        <div className="execution-trace__empty">
          Runtime 정보를 찾을 수 없습니다.
        </div>
      </div>
    );
  }

  const approvalNode =
    approvalStep
      ? workflow.nodes.find(
          (
            node,
          ) =>
            node.id ===
            approvalStep.nodeId,
        )
      : undefined;

  const runtimeControlProcessing =
    runtimeControlAction !==
    null;

  const canPause =
    run.status ===
    "RUNNING";

  const canResume =
    run.status ===
    "PAUSED";

  const canCancel =
    run.status ===
      "IDLE" ||
    run.status ===
      "QUEUED" ||
    run.status ===
      "RUNNING" ||
    run.status ===
      "PAUSED" ||
    run.status ===
      "WAITING_APPROVAL";

  const showRuntimeControls =
    canPause ||
    canResume ||
    canCancel;

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

      {showRuntimeControls && (
        <section
          className="runtime-controls"
          aria-label="Workflow runtime controls"
        >
          {canPause && (
            <button
              type="button"
              className="runtime-button"
              disabled={
                runtimeControlProcessing ||
                approvalProcessing
              }
              onClick={() => {
                void handlePause();
              }}
            >
              <Pause
                size={14}
              />

              {runtimeControlAction ===
              "pause"
                ? "일시정지 중..."
                : "일시정지"}
            </button>
          )}

          {canResume && (
            <button
              type="button"
              className="runtime-button runtime-button--primary"
              disabled={
                runtimeControlProcessing ||
                approvalProcessing
              }
              onClick={() => {
                void handleResume();
              }}
            >
              <Play
                size={14}
              />

              {runtimeControlAction ===
              "resume"
                ? "재개 중..."
                : "실행 재개"}
            </button>
          )}

          {canCancel && (
            <button
              type="button"
              className="runtime-button--danger"
              disabled={
                runtimeControlProcessing ||
                approvalProcessing
              }
              onClick={() => {
                void handleCancel();
              }}
            >
              <Square
                size={13}
              />

              {runtimeControlAction ===
              "cancel"
                ? "취소 중..."
                : "실행 취소"}
            </button>
          )}

          {run.status ===
            "PAUSED" && (
            <span className="runtime-controls__message">
              Workflow가 일시정지되어 있습니다.
              실행 재개를 누르면 중단 지점부터 계속됩니다.
            </span>
          )}

          {run.status ===
            "WAITING_APPROVAL" && (
            <span className="runtime-controls__message">
              사용자 승인이 필요한 Step에서 실행이 대기 중입니다.
            </span>
          )}
        </section>
      )}

      {runtimeControlError && (
        <div
          className="runtime-control-error"
          role="alert"
        >
          {runtimeControlError}
        </div>
      )}

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

      <ExecutionTracePanel
        runId={
          run.id
        }
      />

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
        summary={
          approvalProcessing
            ? "승인 요청을 처리하고 있습니다."
            : "이 Step은 사용자 승인이 필요합니다."
        }
        onApprove={() => {
          void handleApprove();
        }}
        onReject={() => {
          void handleReject();
        }}
        onClose={() => {
          if (
            !approvalProcessing
          ) {
            setApprovalOpen(
              false,
            );
          }
        }}
      />
    </div>
  );
}