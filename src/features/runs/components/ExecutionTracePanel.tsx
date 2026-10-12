import {
  useEffect,
  useState,
} from "react";

import {
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import {
  fetchRunTrace,
} from "../../../api/runs";

interface ExecutionTracePanelProps {
  runId: string;
}

type UnknownRecord =
  Record<
    string,
    unknown
  >;

function isRecord(
  value: unknown,
): value is UnknownRecord {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  );
}

function getString(
  record: UnknownRecord,
  ...keys: string[]
) {
  for (
    const key
    of keys
  ) {
    const value =
      record[key];

    if (
      typeof value ===
      "string"
    ) {
      return value;
    }
  }

  return undefined;
}

function getNumber(
  record: UnknownRecord,
  ...keys: string[]
) {
  for (
    const key
    of keys
  ) {
    const value =
      record[key];

    if (
      typeof value ===
        "number" &&
      Number.isFinite(
        value,
      )
    ) {
      return value;
    }
  }

  return undefined;
}

function getArray(
  record: UnknownRecord,
  ...keys: string[]
) {
  for (
    const key
    of keys
  ) {
    const value =
      record[key];

    if (
      Array.isArray(
        value,
      )
    ) {
      return value;
    }
  }

  return [];
}

function getRecord(
  record: UnknownRecord,
  ...keys: string[]
) {
  for (
    const key
    of keys
  ) {
    const value =
      record[key];

    if (
      isRecord(
        value,
      )
    ) {
      return value;
    }
  }

  return undefined;
}

function formatDuration(
  duration:
    | number
    | undefined,
) {
  if (
    duration ===
    undefined
  ) {
    return "-";
  }

  if (
    duration <
    1000
  ) {
    return `${Math.round(
      duration,
    )}ms`;
  }

  const seconds =
    duration /
    1000;

  if (
    seconds <
    60
  ) {
    return `${seconds.toFixed(
      1,
    )}초`;
  }

  const minutes =
    Math.floor(
      seconds /
      60,
    );

  const remainingSeconds =
    Math.round(
      seconds %
      60,
    );

  return `${minutes}분 ${remainingSeconds}초`;
}

function formatDateTime(
  value:
    | string
    | undefined,
) {
  if (
    !value
  ) {
    return "-";
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    "ko-KR",
  );
}

function formatCost(
  value:
    | number
    | undefined,
) {
  return `$${(
    value ??
    0
  ).toFixed(
    4,
  )}`;
}

function normalizeBadgeClass(
  value:
    | string
    | undefined,
) {
  if (
    !value
  ) {
    return "";
  }

  const normalized =
    value
      .trim()
      .toLowerCase()
      .replace(
        /_/g,
        "-",
      );

  if (
    normalized ===
    "waiting-approval" ||
    normalized ===
    "require-approval"
  ) {
    return "approval";
  }

  return normalized;
}

function getTraceSteps(
  trace: UnknownRecord,
) {
  return getArray(
    trace,
    "steps",
  ).filter(
    isRecord,
  );
}

function getSummary(
  trace: UnknownRecord,
) {
  return (
    getRecord(
      trace,
      "summary",
    ) ??
    {}
  );
}

function isTerminalTrace(
  trace: UnknownRecord,
) {
  const status =
    getString(
      trace,
      "status",
      "runStatus",
    );

  return (
    status ===
      "COMPLETED" ||
    status ===
      "FAILED" ||
    status ===
      "CANCELLED"
  );
}

export function ExecutionTracePanel({
  runId,
}: ExecutionTracePanelProps) {
  const [
    trace,
    setTrace,
  ] =
    useState<
      UnknownRecord | null
    >(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    expandedSteps,
    setExpandedSteps,
  ] =
    useState<
      Set<string>
    >(
      new Set(),
    );

  useEffect(
    () => {
      let cancelled =
        false;

      let timeoutId:
        | number
        | undefined;

      async function loadTrace() {
        try {
          const result =
            await fetchRunTrace(
              runId,
            );

          if (
            cancelled
          ) {
            return;
          }

          const normalizedTrace =
            result as unknown;

          if (
            !isRecord(
              normalizedTrace,
            )
          ) {
            throw new Error(
              "Execution Trace 응답 형식이 올바르지 않습니다.",
            );
          }

          setTrace(
            normalizedTrace,
          );

          setError(
            null,
          );

          /*
           * terminal 상태가 아니라면
           * STEP 50에서 사용하던 방식대로
           * Trace를 주기적으로 다시 조회한다.
           */
          if (
            !isTerminalTrace(
              normalizedTrace,
            )
          ) {
            timeoutId =
              window.setTimeout(
                () => {
                  void loadTrace();
                },
                1500,
              );
          }
        } catch (
          loadError
        ) {
          if (
            cancelled
          ) {
            return;
          }

          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Execution Trace를 불러오지 못했습니다.",
          );

          /*
           * 실행 중 일시적인 네트워크 오류가 발생해도
           * 다음 polling에서 복구할 수 있도록 다시 시도한다.
           */
          timeoutId =
            window.setTimeout(
              () => {
                void loadTrace();
              },
              3000,
            );
        } finally {
          if (
            !cancelled
          ) {
            setLoading(
              false,
            );
          }
        }
      }

      setLoading(
        true,
      );

      void loadTrace();

      return () => {
        cancelled =
          true;

        if (
          timeoutId !==
          undefined
        ) {
          window.clearTimeout(
            timeoutId,
          );
        }
      };
    },
    [
      runId,
    ],
  );

  function toggleStep(
    stepId: string,
  ) {
    setExpandedSteps(
      (
        previous,
      ) => {
        const next =
          new Set(
            previous,
          );

        if (
          next.has(
            stepId,
          )
        ) {
          next.delete(
            stepId,
          );
        } else {
          next.add(
            stepId,
          );
        }

        return next;
      },
    );
  }

  if (
    loading &&
    !trace
  ) {
    return (
      <section className="execution-trace">
        <div className="execution-trace__header">
          <div>
            <h2>
              Execution Trace
            </h2>

            <p>
              Workflow 실행 과정의 Agent, Tool,
              Policy, Retry와 비용 정보를 분석하고 있습니다.
            </p>
          </div>
        </div>

        <div className="execution-trace__loading">
          Execution Trace를 불러오는 중입니다...
        </div>
      </section>
    );
  }

  if (
    !trace
  ) {
    return (
      <section className="execution-trace">
        <div className="execution-trace__header">
          <div>
            <h2>
              Execution Trace
            </h2>

            <p>
              Workflow 실행 과정의 세부 Observability 정보를
              확인합니다.
            </p>
          </div>
        </div>

        {error ? (
          <div className="execution-trace__error">
            {error}
          </div>
        ) : (
          <div className="execution-trace__empty">
            Execution Trace가 아직 없습니다.
          </div>
        )}
      </section>
    );
  }

  const summary =
    getSummary(
      trace,
    );

  const steps =
    getTraceSteps(
      trace,
    );

  const totalSteps =
    getNumber(
      summary,
      "totalSteps",
      "stepCount",
    ) ??
    steps.length;

  const completedSteps =
    getNumber(
      summary,
      "completedSteps",
    ) ??
    steps.filter(
      (
        step,
      ) =>
        getString(
          step,
          "status",
        ) ===
        "COMPLETED",
    ).length;

  const retryCount =
    getNumber(
      summary,
      "retryCount",
      "retries",
      "totalRetries",
    ) ??
    0;

  const recoveryCount =
    getNumber(
      summary,
      "recoveryCount",
      "recoveries",
      "totalRecoveries",
    ) ??
    0;

  const tokenUsage =
    getNumber(
      summary,
      "tokenUsage",
      "totalTokens",
      "tokens",
    ) ??
    0;

  const cost =
    getNumber(
      summary,
      "cost",
      "totalCost",
    ) ??
    0;

  const duration =
    getNumber(
      summary,
      "durationMs",
      "duration",
    );

  return (
    <section className="execution-trace">
      <div className="execution-trace__header">
        <div>
          <h2>
            Execution Trace
          </h2>

          <p>
            각 Step의 실행 상태와 Agent, Tool, Policy,
            Retry, Recovery, Token 및 비용 정보를
            추적합니다.
          </p>
        </div>

        {getString(
          trace,
          "status",
          "runStatus",
        ) && (
          <span
            className={[
              "runtime-status",
              `runtime-status--${(
                getString(
                  trace,
                  "status",
                  "runStatus",
                ) ??
                ""
              ).toLowerCase()}`,
            ].join(
              " ",
            )}
          >
            {getString(
              trace,
              "status",
              "runStatus",
            )}
          </span>
        )}
      </div>

      {error && (
        <div className="execution-trace__error">
          최신 Trace 갱신에 실패했습니다. 마지막으로 불러온
          데이터를 표시합니다. {error}
        </div>
      )}

      <div className="execution-trace__summary">
        <TraceSummaryCard
          label="전체 Step"
          value={`${totalSteps}`}
        />

        <TraceSummaryCard
          label="완료"
          value={`${completedSteps}`}
        />

        <TraceSummaryCard
          label="Retry"
          value={`${retryCount}`}
        />

        <TraceSummaryCard
          label="Recovery"
          value={`${recoveryCount}`}
        />

        <TraceSummaryCard
          label="Token"
          value={`${tokenUsage}`}
        />

        <TraceSummaryCard
          label="Cost"
          value={formatCost(
            cost,
          )}
        />

        <TraceSummaryCard
          label="Duration"
          value={formatDuration(
            duration,
          )}
        />
      </div>

      {steps.length ===
      0 ? (
        <div className="execution-trace__empty">
          기록된 Step Trace가 없습니다.
        </div>
      ) : (
        <div className="execution-trace__steps">
          {steps.map(
            (
              step,
              index,
            ) => {
              const nodeId =
                getString(
                  step,
                  "nodeId",
                  "stepId",
                  "id",
                ) ??
                `trace-step-${index}`;

              const stepName =
                getString(
                  step,
                  "nodeName",
                  "stepName",
                  "name",
                ) ??
                `Step ${index + 1}`;

              const status =
                getString(
                  step,
                  "status",
                ) ??
                "UNKNOWN";

              const policyDecision =
                getString(
                  step,
                  "policyDecision",
                  "policy",
                ) ??
                "UNKNOWN";

              const riskLevel =
                getString(
                  step,
                  "riskLevel",
                  "risk",
                ) ??
                "UNKNOWN";

              const durationMs =
                getNumber(
                  step,
                  "durationMs",
                  "duration",
                );

              const expanded =
                expandedSteps.has(
                  nodeId,
                );

              const agent =
                getRecord(
                  step,
                  "agent",
                );

              const tools =
                getArray(
                  step,
                  "tools",
                ).filter(
                  isRecord,
                );

              const logs =
                getArray(
                  step,
                  "logs",
                ).filter(
                  isRecord,
                );

              const retry =
                getNumber(
                  step,
                  "retryCount",
                  "retries",
                ) ??
                0;

              const recovery =
                getNumber(
                  step,
                  "recoveryCount",
                  "recoveries",
                ) ??
                0;

              const stepTokens =
                getNumber(
                  step,
                  "tokenUsage",
                  "tokens",
                  "totalTokens",
                ) ??
                0;

              const stepCost =
                getNumber(
                  step,
                  "cost",
                ) ??
                0;

              return (
                <article
                  key={
                    nodeId
                  }
                  className="execution-trace-step"
                >
                  <button
                    type="button"
                    className="execution-trace-step__toggle"
                    aria-expanded={
                      expanded
                    }
                    onClick={() => {
                      toggleStep(
                        nodeId,
                      );
                    }}
                  >
                    <div className="execution-trace-step__identity">
                      <strong>
                        {expanded ? (
                          <ChevronDown
                            size={13}
                            style={{
                              verticalAlign:
                                "middle",
                              marginRight:
                                "5px",
                            }}
                          />
                        ) : (
                          <ChevronRight
                            size={13}
                            style={{
                              verticalAlign:
                                "middle",
                              marginRight:
                                "5px",
                            }}
                          />
                        )}

                        {stepName}
                      </strong>

                      <span>
                        Step {index + 1}
                      </span>
                    </div>

                    <span
                      className={[
                        "execution-trace-step__badge",
                        `execution-trace-step__badge--${normalizeBadgeClass(
                          status,
                        )}`,
                      ].join(
                        " ",
                      )}
                    >
                      {status}
                    </span>

                    <span
                      className={[
                        "execution-trace-step__badge",
                        `execution-trace-step__badge--${normalizeBadgeClass(
                          policyDecision,
                        )}`,
                      ].join(
                        " ",
                      )}
                    >
                      {policyDecision}
                    </span>

                    <span className="execution-trace-step__meta">
                      Risk · {riskLevel}
                    </span>

                    <span className="execution-trace-step__meta">
                      {formatDuration(
                        durationMs,
                      )}
                    </span>
                  </button>

                  {expanded && (
                    <div className="execution-trace-step__details">
                      <div className="execution-trace-details-grid">
                        <TraceDetail
                          label="Agent"
                          value={
                            agent
                              ? getString(
                                  agent,
                                  "name",
                                  "agentName",
                                  "id",
                                ) ??
                                "-"
                              : "-"
                          }
                        />

                        <TraceDetail
                          label="Model"
                          value={
                            agent
                              ? getString(
                                  agent,
                                  "modelId",
                                  "model",
                                ) ??
                                "-"
                              : "-"
                          }
                        />

                        <TraceDetail
                          label="Retry"
                          value={`${retry}`}
                        />

                        <TraceDetail
                          label="Recovery"
                          value={`${recovery}`}
                        />

                        <TraceDetail
                          label="Approval"
                          value={
                            getString(
                              step,
                              "approvalStatus",
                              "approval",
                            ) ??
                            "-"
                          }
                        />

                        <TraceDetail
                          label="Policy"
                          value={
                            policyDecision
                          }
                        />

                        <TraceDetail
                          label="Risk"
                          value={
                            riskLevel
                          }
                        />

                        <TraceDetail
                          label="Token"
                          value={`${stepTokens}`}
                        />

                        <TraceDetail
                          label="Cost"
                          value={formatCost(
                            stepCost,
                          )}
                        />

                        <TraceDetail
                          label="Started"
                          value={formatDateTime(
                            getString(
                              step,
                              "startedAt",
                            ),
                          )}
                        />
                      </div>

                      <div className="execution-trace-section">
                        <strong>
                          Tools
                        </strong>

                        {tools.length >
                        0 ? (
                          <div className="execution-trace-tools">
                            {tools.map(
                              (
                                tool,
                                toolIndex,
                              ) => {
                                const enabled =
                                  typeof tool.enabled ===
                                  "boolean"
                                    ? tool.enabled
                                    : true;

                                return (
                                  <span
                                    key={
                                      getString(
                                        tool,
                                        "id",
                                      ) ??
                                      `${nodeId}-tool-${toolIndex}`
                                    }
                                    className={[
                                      "execution-trace-tool",
                                      enabled
                                        ? ""
                                        : "execution-trace-tool--disabled",
                                    ]
                                      .filter(
                                        Boolean,
                                      )
                                      .join(
                                        " ",
                                      )}
                                  >
                                    {getString(
                                      tool,
                                      "name",
                                      "type",
                                      "id",
                                    ) ??
                                      "Unknown Tool"}
                                  </span>
                                );
                              },
                            )}
                          </div>
                        ) : (
                          <p className="runtime-muted">
                            사용된 Tool이 없습니다.
                          </p>
                        )}
                      </div>

                      <div className="execution-trace-section">
                        <strong>
                          Execution Logs
                        </strong>

                        {logs.length >
                        0 ? (
                          <div className="execution-trace-logs">
                            {logs.map(
                              (
                                log,
                                logIndex,
                              ) => (
                                <div
                                  key={
                                    getString(
                                      log,
                                      "id",
                                    ) ??
                                    `${nodeId}-log-${logIndex}`
                                  }
                                  className="execution-trace-log"
                                >
                                  <span className="execution-trace-log__level">
                                    {getString(
                                      log,
                                      "level",
                                    ) ??
                                      "info"}
                                  </span>

                                  <span className="execution-trace-log__time">
                                    {formatDateTime(
                                      getString(
                                        log,
                                        "timestamp",
                                        "createdAt",
                                      ),
                                    )}
                                  </span>

                                  <span className="execution-trace-log__message">
                                    {getString(
                                      log,
                                      "message",
                                    ) ??
                                      "-"}
                                  </span>
                                </div>
                              ),
                            )}
                          </div>
                        ) : (
                          <p className="runtime-muted">
                            기록된 Trace Log가 없습니다.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              );
            },
          )}
        </div>
      )}
    </section>
  );
}

interface TraceSummaryCardProps {
  label: string;
  value: string;
}

function TraceSummaryCard({
  label,
  value,
}: TraceSummaryCardProps) {
  return (
    <article className="execution-trace-summary-card">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </article>
  );
}

interface TraceDetailProps {
  label: string;
  value: string;
}

function TraceDetail({
  label,
  value,
}: TraceDetailProps) {
  return (
    <div className="execution-trace-detail">
      <span>
        {label}
      </span>

      <strong
        title={
          value
        }
      >
        {value}
      </strong>
    </div>
  );
}