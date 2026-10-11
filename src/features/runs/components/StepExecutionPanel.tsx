import {
  Bot,
  CheckCircle2,
  Clock3,
  Coins,
  Cpu,
  ExternalLink,
  Search,
  Wrench,
  XCircle,
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

interface ToolSource {
  title?: string;

  url?: string;
}

interface WebSearchOutput {
  query?: string;

  text?: string;

  sources?: ToolSource[];
}

interface ExecutedToolResult {
  toolId?: string;

  toolName?: string;

  status?: "SUCCESS" | "FAILED";

  output?: unknown;

  startedAt?: string;

  completedAt?: string;
}

interface StepExecutionOutput {
  text?: string;

  agentId?: string;

  agentName?: string;

  provider?: string;

  modelId?: string;

  inputTokens?: number;

  outputTokens?: number;

  totalTokens?: number;

  tools?: ExecutedToolResult[];
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

  const executionOutput =
    getStepExecutionOutput(
      stepRun?.output,
    );

  const agent =
    getAgentById(
      node.agentId,
    );

  const displayModelId =
    executionOutput?.modelId ??
    agent?.modelId ??
    node.modelId;

  const model =
    getModelById(
      displayModelId,
    );

  const configuredTools =
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

  const executedTools =
    executionOutput?.tools ??
    [];

  const modelDisplayName =
    model?.displayName ??
    formatModelId(
      displayModelId,
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
            executionOutput
              ?.agentName ??
            agent?.name ??
            "없음"
          }
        />

        <RuntimeInfo
          icon={Cpu}
          label="Model"
          value={
            modelDisplayName
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

        {executedTools.length >
        0 ? (
          <div className="runtime-tool-results">
            {executedTools.map(
              (
                toolResult,
                index,
              ) => (
                <ExecutedToolCard
                  key={
                    toolResult.toolId ??
                    `${toolResult.toolName}-${index}`
                  }
                  toolResult={
                    toolResult
                  }
                />
              ),
            )}
          </div>
        ) : configuredTools.length >
          0 ? (
          <>
            <p className="runtime-muted">
              이 Step에 설정된 Tool
            </p>

            <div className="runtime-tools">
              {configuredTools.map(
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
          </>
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
                        hour12:
                          false,
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

interface ExecutedToolCardProps {
  toolResult: ExecutedToolResult;
}

function ExecutedToolCard({
  toolResult,
}: ExecutedToolCardProps) {
  const searchOutput =
    getWebSearchOutput(
      toolResult.output,
    );

  const success =
    toolResult.status ===
    "SUCCESS";

  return (
    <article className="runtime-tool-card">
      <div className="runtime-tool-card__header">
        <div className="runtime-tool-card__title">
          <div className="runtime-tool-card__icon">
            {toolResult.toolId ===
            "web-search" ? (
              <Search size={15} />
            ) : (
              <Wrench size={15} />
            )}
          </div>

          <div>
            <strong>
              {toolResult.toolName ??
                toolResult.toolId ??
                "Tool"}
            </strong>

            <span>
              실제 실행 Tool
            </span>
          </div>
        </div>

        <span
          className={[
            "runtime-tool-status",
            success
              ? "runtime-tool-status--success"
              : "runtime-tool-status--failed",
          ].join(" ")}
        >
          {success ? (
            <CheckCircle2
              size={13}
            />
          ) : (
            <XCircle
              size={13}
            />
          )}

          {success
            ? "SUCCESS"
            : "FAILED"}
        </span>
      </div>

      {searchOutput?.query && (
        <div className="runtime-tool-card__section">
          <span className="runtime-tool-card__label">
            검색어
          </span>

          <p>
            {
              searchOutput.query
            }
          </p>
        </div>
      )}

      {searchOutput?.text && (
        <div className="runtime-tool-card__section">
          <span className="runtime-tool-card__label">
            검색 결과 요약
          </span>

          <p className="runtime-tool-card__summary">
            {
              searchOutput.text
            }
          </p>
        </div>
      )}

      {searchOutput?.sources &&
        searchOutput.sources
          .length > 0 && (
          <div className="runtime-tool-card__section">
            <span className="runtime-tool-card__label">
              Sources (
              {
                searchOutput
                  .sources
                  .length
              }
              )
            </span>

            <div className="runtime-tool-sources">
              {searchOutput.sources.map(
                (
                  source,
                  index,
                ) => (
                  <SourceItem
                    key={`${source.url ?? source.title ?? "source"}-${index}`}
                    source={
                      source
                    }
                    index={
                      index
                    }
                  />
                ),
              )}
            </div>
          </div>
        )}
    </article>
  );
}

interface SourceItemProps {
  source: ToolSource;

  index: number;
}

function SourceItem({
  source,
  index,
}: SourceItemProps) {
  const label =
    source.title?.trim() ||
    source.url?.trim() ||
    `Source ${index + 1}`;

  if (!source.url) {
    return (
      <div className="runtime-tool-source">
        <span>
          {index + 1}
        </span>

        <p>
          {label}
        </p>
      </div>
    );
  }

  return (
    <a
      className="runtime-tool-source runtime-tool-source--link"
      href={
        source.url
      }
      target="_blank"
      rel="noreferrer"
    >
      <span>
        {index + 1}
      </span>

      <p>
        {label}
      </p>

      <ExternalLink
        size={13}
      />
    </a>
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

function getStepExecutionOutput(
  output: unknown,
): StepExecutionOutput | undefined {
  if (
    !output ||
    typeof output !==
      "object" ||
    Array.isArray(
      output,
    )
  ) {
    return undefined;
  }

  return output as StepExecutionOutput;
}

function getWebSearchOutput(
  output: unknown,
): WebSearchOutput | undefined {
  if (
    !output ||
    typeof output !==
      "object" ||
    Array.isArray(
      output,
    )
  ) {
    return undefined;
  }

  return output as WebSearchOutput;
}

function formatModelId(
  modelId:
    | string
    | undefined,
) {
  if (!modelId) {
    return "없음";
  }

  return modelId
    .split("-")
    .map(
      (part) => {
        if (
          /^\d+(\.\d+)*$/.test(
            part,
          )
        ) {
          return part;
        }

        return (
          part
            .charAt(0)
            .toUpperCase() +
          part.slice(1)
        );
      },
    )
    .join(" ");
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