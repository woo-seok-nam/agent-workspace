import {
  MoreHorizontal,
  Pause,
  Play,
  Square,
} from "lucide-react";

import type {
  WorkflowRunStatus,
} from "../types";

interface RunHeaderProps {
  name: string;

  workflowName: string;

  status: WorkflowRunStatus;

  onPause?: () => void;

  onResume?: () => void;

  onStop?: () => void;
}

export function RunHeader({
  name,
  workflowName,
  status,
  onPause,
  onResume,
  onStop,
}: RunHeaderProps) {
  const isRunning =
    status === "RUNNING";

  const isPaused =
    status === "PAUSED";

  return (
    <header className="run-header">
      <div>
        <div className="run-header__breadcrumb">
          Runs / {name}
        </div>

        <div className="run-header__title">
          <h1>{name}</h1>

          <RunStatusBadge
            status={status}
          />
        </div>

        <p>
          Workflow: {workflowName}
        </p>
      </div>

      <div className="run-header__actions">
        {isRunning && (
          <button
            type="button"
            className="secondary-button"
            onClick={onPause}
          >
            <Pause size={14} />
            일시정지
          </button>
        )}

        {isPaused && (
          <button
            type="button"
            className="secondary-button"
            onClick={onResume}
          >
            <Play size={14} />
            재개
          </button>
        )}

        {(isRunning ||
          isPaused) && (
          <button
            type="button"
            className="danger-outline-button"
            onClick={onStop}
          >
            <Square size={13} />
            중지
          </button>
        )}

        <button
          type="button"
          className="builder-icon-button"
          aria-label="더보기"
        >
          <MoreHorizontal
            size={18}
          />
        </button>
      </div>
    </header>
  );
}

interface RunStatusBadgeProps {
  status: WorkflowRunStatus;
}

function RunStatusBadge({
  status,
}: RunStatusBadgeProps) {
  return (
    <span
      className={[
        "runtime-status",
        `runtime-status--${status.toLowerCase()}`,
      ].join(" ")}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function getStatusLabel(
  status: WorkflowRunStatus,
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