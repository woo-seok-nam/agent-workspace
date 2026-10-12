import {
  ArrowUpRight,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

import type {
  WorkflowRun,
} from "../../runs/types";

interface RecentRunsProps {
  runs: WorkflowRun[];
}

export function RecentRuns({
  runs,
}: RecentRunsProps) {
  const recentRuns =
    runs.slice(
      0,
      5,
    );

  return (
    <section className="home-section">
      <div className="home-section__header">
        <div>
          <h2>
            Recent Runs
          </h2>

          <p>
            최근 실행한 Workflow의 상태와
            사용량을 확인할 수 있습니다.
          </p>
        </div>

        <Link
          to="/runs"
          className="home-section__link"
        >
          전체 보기
        </Link>
      </div>

      {recentRuns.length ===
      0 ? (
        <div className="home-empty-state">
          <strong>
            아직 실행 기록이 없습니다.
          </strong>

          <p>
            Workflow를 실행하면 최근 실행 결과가
            여기에 표시됩니다.
          </p>
        </div>
      ) : (
        <div className="recent-runs">
          <table className="recent-runs__table">
            <thead>
              <tr>
                <th>
                  Run
                </th>

                <th>
                  Status
                </th>

                <th>
                  Tokens
                </th>

                <th>
                  Cost
                </th>

                <th>
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {recentRuns.map(
                (
                  run,
                ) => (
                  <tr
                    key={
                      run.id
                    }
                  >
                    <td>
                      <div className="recent-run-name">
                        <strong>
                          {run.name}
                        </strong>

                        <span
                          title={
                            run.id
                          }
                        >
                          {shortenId(
                            run.id,
                          )}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span
                        className={[
                          "run-status",
                          `run-status--${run.status.toLowerCase()}`,
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
                      {run.tokenUsage.toLocaleString()}
                    </td>

                    <td>
                      {formatCost(
                        run.cost,
                      )}
                    </td>

                    <td>
                      <Link
                        to={`/runs/${run.id}`}
                        className="table-action"
                        aria-label={`${run.name} 실행 상세 보기`}
                      >
                        상세
                        <ArrowUpRight
                          size={12}
                        />
                      </Link>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function getStatusLabel(
  status: WorkflowRun["status"],
) {
  switch (
    status
  ) {
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

function shortenId(
  id: string,
) {
  if (
    id.length <=
    16
  ) {
    return id;
  }

  return `${id.slice(
    0,
    8,
  )}...${id.slice(
    -5,
  )}`;
}

function formatCost(
  cost: number,
) {
  if (
    cost ===
    0
  ) {
    return "$0.00";
  }

  if (
    cost <
    0.01
  ) {
    return `$${cost.toFixed(
      4,
    )}`;
  }

  return `$${cost.toFixed(
    2,
  )}`;
}