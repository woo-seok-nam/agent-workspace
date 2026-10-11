import {
  ExternalLink,
  FileText,
  Loader2,
  Trash2,
} from "lucide-react";

import type {
  WorkflowRun,
} from "../types";

interface RunHistoryTableProps {
  runs: WorkflowRun[];

  selectedRunIds: Set<string>;

  deletingRunIds: Set<string>;

  onToggleRun: (
    runId: string,
  ) => void;

  onToggleAll: () => void;

  onOpenRun: (
    runId: string,
  ) => void;

  onOpenResult: (
    runId: string,
  ) => void;

  onDeleteRun: (
    run: WorkflowRun,
  ) => void;
}

export function RunHistoryTable({
  runs,
  selectedRunIds,
  deletingRunIds,
  onToggleRun,
  onToggleAll,
  onOpenRun,
  onOpenResult,
  onDeleteRun,
}: RunHistoryTableProps) {
  if (runs.length === 0) {
    return (
      <div className="run-history-empty">
        조건에 맞는 실행 기록이 없습니다.
      </div>
    );
  }

  const allVisibleSelected =
    runs.length > 0 &&
    runs.every(
      (run) =>
        selectedRunIds.has(
          run.id,
        ),
    );

  const someVisibleSelected =
    runs.some(
      (run) =>
        selectedRunIds.has(
          run.id,
        ),
    );

  return (
    <div className="run-history-table-wrapper">
      <table className="run-history-table">
        <thead>
          <tr>
            <th className="run-history-checkbox-cell">
              <input
                type="checkbox"
                aria-label="현재 목록 전체 선택"
                checked={
                  allVisibleSelected
                }
                ref={(
                  element,
                ) => {
                  if (
                    element
                  ) {
                    element.indeterminate =
                      !allVisibleSelected &&
                      someVisibleSelected;
                  }
                }}
                onChange={
                  onToggleAll
                }
              />
            </th>

            <th>Run</th>
            <th>Status</th>
            <th>Duration</th>
            <th>Tokens</th>
            <th>Cost</th>
            <th>Started</th>
            <th />
          </tr>
        </thead>

        <tbody>
          {runs.map(
            (run) => {
              const deleting =
                deletingRunIds.has(
                  run.id,
                );

              const selected =
                selectedRunIds.has(
                  run.id,
                );

              return (
                <tr
                  key={
                    run.id
                  }
                  className={[
                    selected
                      ? "run-history-row--selected"
                      : "",
                    deleting
                      ? "run-history-row--deleting"
                      : "",
                  ]
                    .filter(
                      Boolean,
                    )
                    .join(
                      " ",
                    )}
                >
                  <td className="run-history-checkbox-cell">
                    <input
                      type="checkbox"
                      aria-label={`${run.name} 선택`}
                      checked={
                        selected
                      }
                      disabled={
                        deleting
                      }
                      onChange={() => {
                        onToggleRun(
                          run.id,
                        );
                      }}
                    />
                  </td>

                  <td>
                    <div className="run-history-name">
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
                  </td>

                  <td>
                    <span
                      className={[
                        "run-history-status",
                        `run-history-status--${run.status.toLowerCase()}`,
                      ].join(
                        " ",
                      )}
                    >
                      {getStatusLabel(
                        run.status,
                      )}
                    </span>
                  </td>

                  <td>
                    {getRunDuration(
                      run.startedAt,
                      run.completedAt,
                    )}
                  </td>

                  <td>
                    {run.tokenUsage.toLocaleString()}
                  </td>

                  <td>
                    $
                    {run.cost.toFixed(
                      2,
                    )}
                  </td>

                  <td>
                    {formatDate(
                      run.startedAt,
                    )}
                  </td>

                  <td>
                    <div className="run-history-actions">
                      <button
                        type="button"
                        className="run-history-icon-button"
                        title="Runtime 열기"
                        disabled={
                          deleting
                        }
                        onClick={() =>
                          onOpenRun(
                            run.id,
                          )
                        }
                      >
                        <ExternalLink
                          size={
                            14
                          }
                        />
                      </button>

                      {run.status ===
                        "COMPLETED" && (
                        <button
                          type="button"
                          className="run-history-icon-button"
                          title="결과 보기"
                          disabled={
                            deleting
                          }
                          onClick={() =>
                            onOpenResult(
                              run.id,
                            )
                          }
                        >
                          <FileText
                            size={
                              14
                            }
                          />
                        </button>
                      )}

                      <button
                        type="button"
                        className="run-history-icon-button run-history-delete-button"
                        title="실행 기록 삭제"
                        disabled={
                          deleting
                        }
                        onClick={() => {
                          onDeleteRun(
                            run,
                          );
                        }}
                      >
                        {deleting ? (
                          <Loader2
                            size={
                              14
                            }
                            className="run-history-spinner"
                          />
                        ) : (
                          <Trash2
                            size={
                              14
                            }
                          />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            },
          )}
        </tbody>
      </table>
    </div>
  );
}

function getStatusLabel(
  status:
    WorkflowRun["status"],
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

function getRunDuration(
  startedAt?: string,
  completedAt?: string,
) {
  if (!startedAt) {
    return "-";
  }

  if (!completedAt) {
    return "진행 중";
  }

  const start =
    new Date(
      startedAt,
    ).getTime();

  const end =
    new Date(
      completedAt,
    ).getTime();

  const seconds =
    Math.max(
      0,
      Math.round(
        (end - start) /
          1000,
      ),
    );

  if (
    seconds <
    60
  ) {
    return `${seconds}초`;
  }

  const minutes =
    Math.floor(
      seconds /
      60,
    );

  const remainingSeconds =
    seconds %
    60;

  return `${minutes}분 ${remainingSeconds}초`;
}

function formatDate(
  date?: string,
) {
  if (!date) {
    return "-";
  }

  return new Date(
    date,
  ).toLocaleString(
    "ko-KR",
    {
      year:
        "numeric",

      month:
        "2-digit",

      day:
        "2-digit",

      hour:
        "2-digit",

      minute:
        "2-digit",
    },
  );
}