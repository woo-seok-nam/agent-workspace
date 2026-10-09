import {
  Bot,
  Clock3,
  Coins,
  Cpu,
  Wrench,
} from "lucide-react";

import type {
  ComponentType,
} from "react";

import type {
  StepRun,
} from "../types";

import type {
  WorkflowNode,
} from "../../workflow/types";

import {
  getAgentById,
  getModelById,
  getToolById,
} from "../../../data/catalogRepository";

interface StepExecutionPanelProps {
  node?: WorkflowNode;

  stepRun?: StepRun;
}

export function StepExecutionPanel({
  node,
  stepRun,
}: StepExecutionPanelProps) {
  if (!node) {
    return (
      <section className="step-execution-panel">
        <div className="runtime-empty">
          확인할 Step을 선택하세요.
        </div>
      </section>
    );
  }

  const agent =
    getAgentById(
      node.agentId,
    );

  const model =
    getModelById(
      node.modelId,
    );

  const tools =
    (node.toolIds ?? [])
      .map(
        (toolId) =>
          getToolById(
            toolId,
          ),
      )
      .filter(
        (
          tool,
        ): tool is NonNullable<
          typeof tool
        > =>
          Boolean(tool),
      );

  return (
    <section className="step-execution-panel">
      <div className="step-runtime-header">
        <div>
          <span>
            현재 Step
          </span>

          <h2>
            {node.name}
          </h2>

          <p>
            {node.description ??
              "Workflow Step을 실행하고 있습니다."}
          </p>
        </div>

        <span
          className={[
            "step-runtime-status",
            `step-runtime-status--${(
              stepRun?.status ??
              "PENDING"
            ).toLowerCase()}`,
          ].join(" ")}
        >
          {stepRun?.status ??
            "PENDING"}
        </span>
      </div>

      <div className="runtime-info-grid">
        <RuntimeInfo
          icon={Bot}
          label="Agent"
          value={
            agent?.name ??
            "없음"
          }
        />

        <RuntimeInfo
          icon={Cpu}
          label="Model"
          value={
            model?.displayName ??
            "없음"
          }
        />

        <RuntimeInfo
          icon={Clock3}
          label="Runtime"
          value={
            stepRun?.startedAt
              ? stepRun.completedAt
                ? getDuration(
                    stepRun.startedAt,
                    stepRun.completedAt,
                  )
                : "진행 중"
              : "-"
          }
        />

        <RuntimeInfo
          icon={Coins}
          label="Token / Cost"
          value={`${stepRun?.tokenUsage ?? 0} tokens / $${(
            stepRun?.cost ?? 0
          ).toFixed(2)}`}
        />
      </div>

      <div className="runtime-section">
        <h3>
          <Wrench size={14} />
          Tools
        </h3>

        {tools.length > 0 ? (
          <div className="runtime-tools">
            {tools.map(
              (tool) => (
                <span
                  key={
                    tool.id
                  }
                >
                  {
                    tool.name
                  }
                </span>
              ),
            )}
          </div>
        ) : (
          <p className="runtime-muted">
            사용 중인 Tool이 없습니다.
          </p>
        )}
      </div>

      <div className="runtime-section">
        <h3>
          Execution Log
        </h3>

        <div className="execution-log">
          {stepRun &&
          stepRun.logs.length >
            0 ? (
            stepRun.logs.map(
              (log) => (
                <div
                  key={
                    log.id
                  }
                  className={[
                    "execution-log__row",
                    `execution-log__row--${log.level}`,
                  ].join(" ")}
                >
                  <time>
                    {new Date(
                      log.timestamp,
                    ).toLocaleTimeString(
                      "ko-KR",
                      {
                        hour12: false,
                      },
                    )}
                  </time>

                  <span>
                    {
                      log.message
                    }
                  </span>
                </div>
              ),
            )
          ) : (
            <div className="execution-log__empty">
              아직 실행 로그가 없습니다.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

interface RuntimeInfoProps {
  icon:
    ComponentType<{
      size?: number;
    }>;

  label: string;

  value: string;
}

function RuntimeInfo({
  icon: Icon,
  label,
  value,
}: RuntimeInfoProps) {
  return (
    <article className="runtime-info-card">
      <div className="runtime-info-card__icon">
        <Icon size={15} />
      </div>

      <div>
        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>
      </div>
    </article>
  );
}

function getDuration(
  startedAt: string,
  completedAt: string,
) {
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

  if (seconds < 60) {
    return `${seconds}초`;
  }

  const minutes =
    Math.floor(
      seconds / 60,
    );

  return `${minutes}분 ${seconds % 60}초`;
}