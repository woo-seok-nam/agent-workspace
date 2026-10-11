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

type DeleteMode =
  | "SINGLE"
  | "BULK";

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
    selectedRunIds,
    setSelectedRunIds,
  ] =
    useState<
      Set<string>
    >(
      new Set(),
    );

  const [
    deletingRunIds,
    setDeletingRunIds,
  ] =
    useState<
      Set<string>
    >(
      new Set(),
    );

  const [
    runPendingDeletion,
    setRunPendingDeletion,
  ] =
    useState<
      WorkflowRun | null
    >(null);

  const [
    deleteMode,
    setDeleteMode,
  ] =
    useState<
      DeleteMode | null
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

  const selectedRuns =
    useMemo(
      () =>
        runs.filter(
          (run) =>
            selectedRunIds.has(
              run.id,
            ),
        ),
      [
        runs,
        selectedRunIds,
      ],
    );

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

  const deleting =
    deletingRunIds.size >
    0;

  function toggleRun(
    runId: string,
  ) {
    setSelectedRunIds(
      (
        current,
      ) => {
        const next =
          new Set(
            current,
          );

        if (
          next.has(
            runId,
          )
        ) {
          next.delete(
            runId,
          );
        } else {
          next.add(
            runId,
          );
        }

        return next;
      },
    );
  }

  function toggleAllVisible() {
    const visibleIds =
      filteredRuns.map(
        (run) =>
          run.id,
      );

    const allSelected =
      visibleIds.length >
        0 &&
      visibleIds.every(
        (runId) =>
          selectedRunIds.has(
            runId,
          ),
      );

    setSelectedRunIds(
      (
        current,
      ) => {
        const next =
          new Set(
            current,
          );

        if (
          allSelected
        ) {
          for (
            const runId
            of visibleIds
          ) {
            next.delete(
              runId,
            );
          }
        } else {
          for (
            const runId
            of visibleIds
          ) {
            next.add(
              runId,
            );
          }
        }

        return next;
      },
    );
  }

  function clearSelection() {
    if (
      deleting
    ) {
      return;
    }

    setSelectedRunIds(
      new Set(),
    );
  }

  function openSingleDeleteModal(
    run: WorkflowRun,
  ) {
    setDeleteError(
      null,
    );

    setDeleteMode(
      "SINGLE",
    );

    setRunPendingDeletion(
      run,
    );
  }

  function openBulkDeleteModal() {
    if (
      selectedRunIds.size ===
      0
    ) {
      return;
    }

    setDeleteError(
      null,
    );

    setDeleteMode(
      "BULK",
    );

    setRunPendingDeletion(
      null,
    );
  }

  function closeDeleteModal() {
    if (
      deleting
    ) {
      return;
    }

    setDeleteError(
      null,
    );

    setDeleteMode(
      null,
    );

    setRunPendingDeletion(
      null,
    );
  }

  async function handleSingleDelete() {
    if (
      !runPendingDeletion
    ) {
      return;
    }

    const runId =
      runPendingDeletion.id;

    try {
      setDeletingRunIds(
        new Set([
          runId,
        ]),
      );

      setDeleteError(
        null,
      );

      await deleteRun(
        runId,
      );

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

      setSelectedRunIds(
        (
          current,
        ) => {
          const next =
            new Set(
              current,
            );

          next.delete(
            runId,
          );

          return next;
        },
      );

      setRunPendingDeletion(
        null,
      );

      setDeleteMode(
        null,
      );
    } catch (deleteRunError) {
      setDeleteError(
        deleteRunError instanceof Error
          ? deleteRunError.message
          : "Run 삭제 중 오류가 발생했습니다.",
      );
    } finally {
      setDeletingRunIds(
        new Set(),
      );
    }
  }

  async function handleBulkDelete() {
    const runIds =
      Array.from(
        selectedRunIds,
      );

    if (
      runIds.length ===
      0
    ) {
      return;
    }

    const successfullyDeleted =
      new Set<string>();

    const failedRuns: {
      runId: string;
      message: string;
    }[] = [];

    try {
      setDeletingRunIds(
        new Set(
          runIds,
        ),
      );

      setDeleteError(
        null,
      );

      /*
       * 지금은 기존 DELETE API를 재사용한다.
       *
       * 한 Run 삭제가 실패해도 다른 Run 삭제는
       * 계속 진행되도록 Promise.allSettled을 사용한다.
       */
      const results =
        await Promise.allSettled(
          runIds.map(
            async (
              runId,
            ) => {
              await deleteRun(
                runId,
              );

              return runId;
            },
          ),
        );

      results.forEach(
        (
          result,
          index,
        ) => {
          const runId =
            runIds[
              index
            ];

          if (!runId) {
            return;
          }

          if (
            result.status ===
            "fulfilled"
          ) {
            successfullyDeleted.add(
              runId,
            );

            return;
          }

          failedRuns.push({
            runId,

            message:
              result.reason instanceof Error
                ? result.reason.message
                : "삭제에 실패했습니다.",
          });
        },
      );

      if (
        successfullyDeleted.size >
        0
      ) {
        setRuns(
          (
            currentRuns,
          ) =>
            currentRuns.filter(
              (run) =>
                !successfullyDeleted.has(
                  run.id,
                ),
            ),
        );
      }

      setSelectedRunIds(
        new Set(
          failedRuns.map(
            (item) =>
              item.runId,
          ),
        ),
      );

      if (
        failedRuns.length ===
        0
      ) {
        setDeleteMode(
          null,
        );

        return;
      }

      setDeleteError(
        `${successfullyDeleted.size}개는 삭제되었고 ${failedRuns.length}개는 삭제하지 못했습니다. 실패한 항목만 다시 선택해두었습니다.`,
      );
    } finally {
      setDeletingRunIds(
        new Set(),
      );
    }
  }

  async function handleConfirmDelete() {
    if (
      deleteMode ===
      "SINGLE"
    ) {
      await handleSingleDelete();

      return;
    }

    if (
      deleteMode ===
      "BULK"
    ) {
      await handleBulkDelete();
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

        {selectedRunIds.size >
          0 && (
          <div className="run-history-selection-bar">
            <div>
              <strong>
                {
                  selectedRunIds.size
                }
                개 선택됨
              </strong>

              <span>
                선택한 실행 기록을
                한 번에 관리할 수 있습니다.
              </span>
            </div>

            <div className="run-history-selection-actions">
              <button
                type="button"
                className="run-history-selection-clear"
                disabled={
                  deleting
                }
                onClick={
                  clearSelection
                }
              >
                선택 해제
              </button>

              <button
                type="button"
                className="run-history-selection-delete"
                disabled={
                  deleting
                }
                onClick={
                  openBulkDeleteModal
                }
              >
                <Trash2
                  size={
                    14
                  }
                />

                선택 삭제
              </button>
            </div>
          </div>
        )}

        <RunHistoryTable
          runs={
            filteredRuns
          }
          selectedRunIds={
            selectedRunIds
          }
          deletingRunIds={
            deletingRunIds
          }
          onToggleRun={
            toggleRun
          }
          onToggleAll={
            toggleAllVisible
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
            openSingleDeleteModal
          }
        />
      </section>

      {deleteMode && (
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
                deleting
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
                {deleteMode ===
                "BULK"
                  ? `${selectedRunIds.size}개의 실행 기록을 삭제하시겠습니까?`
                  : "실행 기록을 삭제하시겠습니까?"}
              </h2>

              <p>
                삭제하면 실행 로그와 생성된 Artifact도
                함께 삭제되며 이 작업은 되돌릴 수 없습니다.
              </p>

              {deleteMode ===
                "SINGLE" &&
                runPendingDeletion && (
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
                )}

              {deleteMode ===
                "BULK" && (
                <div className="run-delete-bulk-list">
                  {selectedRuns
                    .slice(
                      0,
                      5,
                    )
                    .map(
                      (run) => (
                        <div
                          key={
                            run.id
                          }
                          className="run-delete-bulk-item"
                        >
                          <strong>
                            {
                              run.name
                            }
                          </strong>

                          <span>
                            {
                              run.id
                            }
                          </span>
                        </div>
                      ),
                    )}

                  {selectedRuns.length >
                    5 && (
                    <div className="run-delete-bulk-more">
                      외{" "}
                      {selectedRuns.length -
                        5}
                      개
                    </div>
                  )}
                </div>
              )}

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
                  deleting
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
                  deleting
                }
                onClick={() => {
                  void handleConfirmDelete();
                }}
              >
                <Trash2
                  size={
                    14
                  }
                />

                {deleting
                  ? "삭제 중..."
                  : deleteMode ===
                      "BULK"
                    ? `${selectedRunIds.size}개 삭제`
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