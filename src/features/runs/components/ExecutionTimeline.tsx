import {
  Check,
  Circle,
  Clock3,
  LoaderCircle,
  ShieldAlert,
  X,
} from "lucide-react";

import type {
  StepRun,
  StepRunStatus,
} from "../types";

import type {
  WorkflowNode,
} from "../../workflow/types";

interface ExecutionTimelineProps {
  nodes: WorkflowNode[];

  stepRuns: StepRun[];

  selectedNodeId?: string | null;

  onSelect: (
    nodeId: string,
  ) => void;
}

export function ExecutionTimeline({
  nodes,
  stepRuns,
  selectedNodeId,
  onSelect,
}: ExecutionTimelineProps) {
  const executableNodes =
    nodes.filter(
      (node) =>
        node.type !== "input" &&
        node.type !== "output",
    );

  const getStepRun = (
    nodeId: string,
  ) => {
    return stepRuns.find(
      (stepRun) =>
        stepRun.nodeId === nodeId,
    );
  };

  return (
    <aside className="execution-timeline">
      <div className="execution-timeline__header">
        <h2>
          Execution Steps
        </h2>
      </div>

      <div className="execution-timeline__list">
        {executableNodes.map(
          (node, index) => {
            const stepRun =
              getStepRun(node.id);

            const status =
              stepRun?.status ??
              "PENDING";

            return (
              <button
                key={node.id}
                type="button"
                className={[
                  "timeline-step",
                  selectedNodeId ===
                  node.id
                    ? "timeline-step--selected"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() =>
                  onSelect(node.id)
                }
              >
                <div className="timeline-step__rail">
                  <div
                    className={[
                      "timeline-step__status",
                      `timeline-step__status--${status.toLowerCase()}`,
                    ].join(" ")}
                  >
                    <StepStatusIcon
                      status={status}
                    />
                  </div>

                  {index <
                    executableNodes.length -
                      1 && (
                    <div className="timeline-step__line" />
                  )}
                </div>

                <div className="timeline-step__content">
                  <strong>
                    {node.name}
                  </strong>

                  <span>
                    {getStepStatusLabel(
                      status,
                    )}
                  </span>
                </div>

                {stepRun?.startedAt && (
                  <span className="timeline-step__time">
                    {getDuration(
                      stepRun.startedAt,
                      stepRun.completedAt,
                    )}
                  </span>
                )}
              </button>
            );
          },
        )}
      </div>
    </aside>
  );
}

function StepStatusIcon({
  status,
}: {
  status: StepRunStatus;
}) {
  switch (status) {
    case "COMPLETED":
      return <Check size={12} />;

    case "RUNNING":
      return (
        <LoaderCircle
          size={12}
          className="runtime-spin"
        />
      );

    case "WAITING_APPROVAL":
      return (
        <ShieldAlert size={12} />
      );

    case "FAILED":
      return <X size={12} />;

    case "QUEUED":
      return <Clock3 size={11} />;

    case "CANCELLED":
      return <X size={12} />;

    case "SKIPPED":
      return <Circle size={9} />;

    case "PENDING":
    default:
      return <Circle size={9} />;
  }
}

function getStepStatusLabel(
  status: StepRunStatus,
) {
  switch (status) {
    case "PENDING":
      return "대기 중";

    case "QUEUED":
      return "실행 대기";

    case "RUNNING":
      return "실행 중";

    case "WAITING_APPROVAL":
      return "승인 대기";

    case "COMPLETED":
      return "완료";

    case "FAILED":
      return "실패";

    case "SKIPPED":
      return "건너뜀";

    case "CANCELLED":
      return "취소됨";
  }
}

function getDuration(
  startedAt: string,
  completedAt?: string,
) {
  if (!completedAt) {
    return "진행 중";
  }

  const start =
    new Date(startedAt).getTime();

  const end =
    new Date(completedAt).getTime();

  const seconds = Math.max(
    0,
    Math.round(
      (end - start) / 1000,
    ),
  );

  if (seconds < 60) {
    return `${seconds}초`;
  }

  const minutes =
    Math.floor(seconds / 60);

  const remainingSeconds =
    seconds % 60;

  return `${minutes}분 ${remainingSeconds}초`;
}