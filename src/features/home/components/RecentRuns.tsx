import { useNavigate } from "react-router-dom";

import { mockRuns } from "../../../mocks/runs";
import { mockWorkflows } from "../../../mocks/workflows";

export function RecentRuns() {
  const navigate = useNavigate();

  const getWorkflowName = (workflowId: string) => {
    return (
      mockWorkflows.find((workflow) => workflow.id === workflowId)?.name ??
      "Unknown Workflow"
    );
  };

  return (
    <section className="home-section">
      <div className="home-section__header">
        <h2>최근 실행</h2>
      </div>

      <div className="recent-runs">
        <table className="recent-runs__table">
          <thead>
            <tr>
              <th>이름</th>
              <th>워크플로우</th>
              <th>상태</th>
              <th>실행 시간</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {mockRuns.map((run) => (
              <tr
                key={run.id}
                onClick={() => navigate(`/runs/${run.id}`)}
              >
                <td>{run.name}</td>

                <td>
                  {getWorkflowName(run.workflowId)}
                </td>

                <td>
                  <RunStatus status={run.status} />
                </td>

                <td>
                  {run.startedAt
                    ? new Date(run.startedAt).toLocaleString("ko-KR")
                    : "-"}
                </td>

                <td>
                  <button
                    type="button"
                    className="table-action"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/runs/${run.id}`);
                    }}
                  >
                    결과 보기
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface RunStatusProps {
  status: string;
}

function RunStatus({ status }: RunStatusProps) {
  return (
    <span
      className={`run-status run-status--${status.toLowerCase()}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function getStatusLabel(status: string) {
  switch (status) {
    case "RUNNING":
      return "실행 중";

    case "COMPLETED":
      return "완료";

    case "FAILED":
      return "실패";

    case "WAITING_APPROVAL":
      return "승인 대기";

    case "PAUSED":
      return "일시 정지";

    default:
      return status;
  }
}