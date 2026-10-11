import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  Filter,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import {
  deleteRun,
  fetchRuns,
} from "../api/runs";

import type {
  WorkflowRun,
  WorkflowRunStatus,
} from "../features/runs/types";

import {
  RunHistoryTable,
} from "../features/runs/components/RunHistoryTable";

import "../features/runs/RunHistory.css";

type StatusFilter =
  | "ALL"
  | WorkflowRunStatus;

export function RunsHistoryPage() {
  const navigate =
    useNavigate();

  const [
    runs,
    setRuns,
  ] =
    useState<
      WorkflowRun[]
    >([]);

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>(
      "ALL",
    );

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
    runPendingDeletion,
    setRunPendingDeletion,
  ] =
    useState<
      WorkflowRun | null
    >(null);

  const [
    deletingRunId,
    setDeletingRunId,
  ] =
    useState<
      string | null
    >(null);

  const [
    deleteError,
    setDeleteError,
  ] =
    useState<
      string | null
    >(null);

  useEffect(() => {
    async function loadRuns() {
      try {
        setLoading(
          true,
        );

        setError(
          null,
        );

        const data =
          await fetchRuns();

        setRuns(
          data,
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Run 목록을 불러오지 못했습니다.",
        );
      } finally {
        setLoading(
          false,
        );
      }
    }

    void loadRuns();
  }, []);

  const filteredRuns =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      return runs.filter(
        (run) => {
          const matchesSearch =
            !keyword ||
            run.name
              .toLowerCase()
              .includes(
                keyword,
              ) ||
            run.id
              .toLowerCase()
              .includes(
                keyword,
              );

          const matchesStatus =
            statusFilter ===
              "ALL" ||
            run.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        },
      );
    }, [
      runs,
      search,
      statusFilter,
    ]);

  const completedCount =
    runs.filter(
      (run) =>
        run.status ===
        "COMPLETED",
    ).length;

  const runningCount =
    runs.filter(
      (run) =>
        run.status ===
        "RUNNING",
    ).length;

  const failedCount =
    runs.filter(
      (run) =>
        run.status ===
        "FAILED",
    ).length;

  const totalTokens =
    runs.reduce(
      (
        sum,
        run,
      ) =>
        sum +
        run.tokenUsage,
      0,
    );

  const totalCost =
    runs.reduce(
      (
        sum,
        run,
      ) =>
        sum +
        run.cost,
      0,
    );

  function openDeleteModal(
    run: WorkflowRun,
  ) {
    setDeleteError(
      null,
    );

    setRunPendingDeletion(
      run,
    );
  }

  function closeDeleteModal() {
    if (
      deletingRunId
    ) {
      return;
    }

    setDeleteError(
      null,
    );

    setRunPendingDeletion(
      null,
    );
  }

  async function handleDeleteRun() {
    if (
      !runPendingDeletion
    ) {
      return;
    }

    const runId =
      runPendingDeletion.id;

    try {
      setDeletingRunId(
        runId,
      );

      setDeleteError(
        null,
      );

      await deleteRun(
        runId,
      );

      /*
       * 서버에서 삭제가 성공했으므로
       * 로컬 상태에서도 즉시 제거한다.
       *
       * Summary 값 역시 runs를 기반으로 계산하므로
       * 자동으로 함께 갱신된다.
       */
      setRuns(
        (
          currentRuns,
        ) =>
          currentRuns.filter(
            (run) =>
              run.id !==
              runId,
          ),
      );

      setRunPendingDeletion(
        null,
      );
    } catch (deleteRunError) {
      setDeleteError(
        deleteRunError instanceof Error
          ? deleteRunError.message
          : "Run 삭제 중 오류가 발생했습니다.",
      );
    } finally {
      setDeletingRunId(
        null,
      );
    }
  }

  if (loading) {
    return (
      <div className="runs-history-page">
        실행 기록을 불러오는 중입니다...
      </div>
    );
  }

  if (error) {
    return (
      <div className="runs-history-page">
        <h1>
          Execution History
        </h1>

        <p>
          {error}
        </p>

        <p>
          Backend 서버가
          http://localhost:4000
          에서 실행 중인지 확인하세요.
        </p>
      </div>
    );
  }

  return (
    <div className="runs-history-page">
      <header className="runs-history-header">
        <div>
          <span>
            Agent Workspace
          </span>

          <h1>
            Execution History
          </h1>

          <p>
            Workflow 실행 기록과
            상태, Token 사용량,
            비용을 확인합니다.
          </p>
        </div>
      </header>

      <section className="run-summary-grid">
        <SummaryCard
          label="Total Runs"
          value={
            runs.length.toString()
          }
        />

        <SummaryCard
          label="Completed"
          value={
            completedCount.toString()
          }
        />

        <SummaryCard
          label="Running"
          value={
            runningCount.toString()
          }
        />

        <SummaryCard
          label="Failed"
          value={
            failedCount.toString()
          }
        />

        <SummaryCard
          label="Total Tokens"
          value={
            totalTokens.toLocaleString()
          }
        />

        <SummaryCard
          label="Total Cost"
          value={`$${totalCost.toFixed(
            2,
          )}`}
        />
      </section>

      <section className="run-history-panel">
        <div className="run-history-toolbar">
          <div className="run-history-search">
            <Search
              size={
                14
              }
            />

            <input
              type="text"
              placeholder="Run 검색"
              value={
                search
              }
              onChange={(
                event,
              ) => {
                setSearch(
                  event.target
                    .value,
                );
              }}
            />
          </div>

          <div className="run-history-filter">
            <Filter
              size={
                14
              }
            />

            <select
              value={
                statusFilter
              }
              onChange={(
                event,
              ) => {
                setStatusFilter(
                  event.target
                    .value as StatusFilter,
                );
              }}
            >
              <option value="ALL">
                전체 상태
              </option>

              <option value="QUEUED">
                실행 대기
              </option>

              <option value="RUNNING">
                실행 중
              </option>

              <option value="WAITING_APPROVAL">
                승인 대기
              </option>

              <option value="PAUSED">
                일시정지
              </option>

              <option value="COMPLETED">
                완료
              </option>

              <option value="FAILED">
                실패
              </option>

              <option value="CANCELLED">
                취소됨
              </option>
            </select>
          </div>
        </div>

        <RunHistoryTable
          runs={
            filteredRuns
          }
          deletingRunId={
            deletingRunId
          }
          onOpenRun={(
            runId,
          ) => {
            navigate(
              `/runs/${runId}`,
            );
          }}
          onOpenResult={(
            runId,
          ) => {
            navigate(
              `/workspace/${runId}`,
            );
          }}
          onDeleteRun={
            openDeleteModal
          }
        />
      </section>

      {runPendingDeletion && (
        <div
          className="run-delete-modal-backdrop"
          role="presentation"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeDeleteModal();
            }
          }}
        >
          <section
            className="run-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="run-delete-modal-title"
          >
            <button
              type="button"
              className="run-delete-modal-close"
              aria-label="닫기"
              disabled={
                Boolean(
                  deletingRunId,
                )
              }
              onClick={
                closeDeleteModal
              }
            >
              <X
                size={
                  16
                }
              />
            </button>

            <div className="run-delete-modal-icon">
              <AlertTriangle
                size={
                  22
                }
              />
            </div>

            <div className="run-delete-modal-content">
              <span>
                Delete Run
              </span>

              <h2
                id="run-delete-modal-title"
              >
                실행 기록을 삭제하시겠습니까?
              </h2>

              <p>
                삭제하면 실행 로그와 생성된 Artifact도
                함께 삭제되며 이 작업은 되돌릴 수 없습니다.
              </p>

              <div className="run-delete-target">
                <strong>
                  {
                    runPendingDeletion.name
                  }
                </strong>

                <span>
                  {
                    runPendingDeletion.id
                  }
                </span>

                <span>
                  상태:{" "}
                  {getStatusLabel(
                    runPendingDeletion.status,
                  )}
                </span>
              </div>

              {deleteError && (
                <div className="run-delete-error">
                  {
                    deleteError
                  }
                </div>
              )}
            </div>

            <footer className="run-delete-modal-actions">
              <button
                type="button"
                className="run-delete-cancel-button"
                disabled={
                  Boolean(
                    deletingRunId,
                  )
                }
                onClick={
                  closeDeleteModal
                }
              >
                취소
              </button>

              <button
                type="button"
                className="run-delete-confirm-button"
                disabled={
                  Boolean(
                    deletingRunId,
                  )
                }
                onClick={() => {
                  void handleDeleteRun();
                }}
              >
                <Trash2
                  size={
                    14
                  }
                />

                {deletingRunId
                  ? "삭제 중..."
                  : "삭제"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

interface SummaryCardProps {
  label: string;

  value: string;
}

function SummaryCard({
  label,
  value,
}: SummaryCardProps) {
  return (
    <article className="run-summary-card">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </article>
  );
}

function getStatusLabel(
  status:
    WorkflowRunStatus,
) {
  switch (status) {
    case "IDLE":
      return "대기";

    case "QUEUED":
      return "실행 대기";

    case "RUNNING":
      return "실행 중";

    case "PAUSED":
      return "일시정지";

    case "WAITING_APPROVAL":
      return "승인 대기";

    case "COMPLETED":
      return "완료";

    case "FAILED":
      return "실패";

    case "CANCELLED":
      return "취소됨";
  }
}