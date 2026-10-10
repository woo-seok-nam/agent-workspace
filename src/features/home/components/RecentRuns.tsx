import {
  ArrowUpRight,
} from "lucide-react";

import {
  useNavigate,
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
  const navigate =
    useNavigate();

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
            최근 실행한 Workflow를
            확인합니다.
          </p>
        </div>

        <button
          type="button"
          className="home-section__link"
          onClick={() => {
            navigate(
              "/runs",
            );
          }}
        >
          전체 보기
        </button>
      </div>

      {recentRuns.length === 0 ? (
        <div className="home-empty-state">
          아직 실행 기록이 없습니다.
        </div>
      ) : (
        <div className="recent-runs-table-wrapper">
          <table className="recent-runs-table">
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

                <th />
              </tr>
            </thead>

            <tbody>
              {recentRuns.map(
                (run) => (
                  <tr
                    key={
                      run.id
                    }
                  >
                    <td>
                      <div className="recent-run-name">
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
                          "recent-run-status",
                          `recent-run-status--${run.status.toLowerCase()}`,
                        ].join(
                          " ",
                        )}
                      >
                        {
                          getStatusLabel(
                            run.status,
                          )
                        }
                      </span>
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
                      <button
                        type="button"
                        className="recent-run-action"
                        aria-label={`${run.name} 실행 상세 보기`}
                        onClick={() => {
                          navigate(
                            `/runs/${run.id}`,
                          );
                        }}
                      >
                        <ArrowUpRight
                          size={14}
                        />
                      </button>
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