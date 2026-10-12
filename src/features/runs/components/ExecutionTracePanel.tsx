import {
  useEffect,
  useState,
} from "react";

import {
  fetchRunTrace,
} from "../../../api/runs";

import type {
  ExecutionTraceStep,
  WorkflowExecutionTrace,
} from "../../../api/runs";

interface ExecutionTracePanelProps {
  runId: string;
}

const TERMINAL_STATUSES =
  new Set([
    "COMPLETED",
    "FAILED",
    "CANCELLED",
  ]);

function formatDuration(
  durationMs?: number,
) {
  if (
    durationMs === undefined
  ) {
    return "-";
  }

  if (
    durationMs <
    1000
  ) {
    return `${durationMs}ms`;
  }

  const seconds =
    durationMs /
    1000;

  if (
    seconds <
    60
  ) {
    return `${seconds.toFixed(
      1,
    )}s`;
  }

  const minutes =
    Math.floor(
      seconds /
      60,
    );

  const remainingSeconds =
    Math.floor(
      seconds %
      60,
    );

  return `${minutes}m ${remainingSeconds}s`;
}

function formatCost(
  cost: number,
) {
  if (
    !Number.isFinite(
      cost,
    )
  ) {
    return "-";
  }

  return `$${cost.toFixed(
    6,
  )}`;
}

function getPolicyLabel(
  decision:
    ExecutionTraceStep["policyDecision"],
) {
  switch (
    decision
  ) {
    case "ALLOW":
      return "자동 실행 허용";

    case "REQUIRE_APPROVAL":
      return "사용자 승인 필요";

    case "DENY":
      return "실행 차단";

    case "UNKNOWN":
      return "확인되지 않음";
  }
}

function getRiskLabel(
  risk:
    ExecutionTraceStep["riskLevel"],
) {
  switch (
    risk
  ) {
    case "LOW":
      return "낮음";

    case "MEDIUM":
      return "보통";

    case "HIGH":
      return "높음";

    case "CRITICAL":
      return "매우 높음";

    case "UNKNOWN":
      return "확인되지 않음";
  }
}

function getStatusLabel(
  status:
    ExecutionTraceStep["status"],
) {
  switch (
    status
  ) {
    case "PENDING":
      return "대기";

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
      return "취소";
  }
}

export function ExecutionTracePanel({
  runId,
}: ExecutionTracePanelProps) {
  const [
    trace,
    setTrace,
  ] =
    useState<
      WorkflowExecutionTrace | null
    >(null);

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
    expandedStepIds,
    setExpandedStepIds,
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

      let intervalId:
        number | undefined;

      async function loadTrace(
        showLoading:
          boolean,
      ) {
        try {
          if (
            showLoading
          ) {
            setLoading(
              true,
            );
          }

          const data =
            await fetchRunTrace(
              runId,
            );

          if (
            cancelled
          ) {
            return;
          }

          setTrace(
            data,
          );

          setError(
            null,
          );

          if (
            TERMINAL_STATUSES.has(
              data.status,
            ) &&
            intervalId !==
              undefined
          ) {
            window.clearInterval(
              intervalId,
            );

            intervalId =
              undefined;
          }
        } catch (
          traceError
        ) {
          if (
            cancelled
          ) {
            return;
          }

          setError(
            traceError instanceof Error
              ? traceError.message
              : "Execution Trace를 불러오지 못했습니다.",
          );
        } finally {
          if (
            !cancelled &&
            showLoading
          ) {
            setLoading(
              false,
            );
          }
        }
      }

      void loadTrace(
        true,
      );

      intervalId =
        window.setInterval(
          () => {
            void loadTrace(
              false,
            );
          },
          1500,
        );

      return () => {
        cancelled =
          true;

        if (
          intervalId !==
          undefined
        ) {
          window.clearInterval(
            intervalId,
          );
        }
      };
    },
    [
      runId,
    ],
  );

  function toggleStep(
    stepRunId: string,
  ) {
    setExpandedStepIds(
      (
        current,
      ) => {
        const next =
          new Set(
            current,
          );

        if (
          next.has(
            stepRunId,
          )
        ) {
          next.delete(
            stepRunId,
          );
        } else {
          next.add(
            stepRunId,
          );
        }

        return next;
      },
    );
  }

  if (
    loading
  ) {
    return (
      <section
        style={{
          marginTop:
            "24px",
        }}
      >
        <h2>
          Execution Trace
        </h2>

        <p>
          실행 추적 정보를 불러오는 중입니다...
        </p>
      </section>
    );
  }

  if (
    error &&
    !trace
  ) {
    return (
      <section
        style={{
          marginTop:
            "24px",

          padding:
            "16px",

          border:
            "1px solid rgba(148, 163, 184, 0.25)",

          borderRadius:
            "12px",
        }}
      >
        <h2>
          Execution Trace
        </h2>

        <p>
          {error}
        </p>
      </section>
    );
  }

  if (
    !trace
  ) {
    return null;
  }

  return (
    <section
      style={{
        display:
          "grid",

        gap:
          "16px",

        marginTop:
          "24px",
      }}
    >
      <div>
        <h2>
          Execution Trace
        </h2>

        <p>
          Workflow 실행 과정의
          Agent, Tool, Policy,
          Retry, Recovery 및
          비용 정보를 추적합니다.
        </p>

        {error && (
          <p>
            Trace 갱신 중 오류:{" "}
            {error}
          </p>
        )}
      </div>

      <div
        style={{
          display:
            "grid",

          gridTemplateColumns:
            "repeat(auto-fit, minmax(140px, 1fr))",

          gap:
            "12px",
        }}
      >
        <TraceSummaryCard
          label="Duration"
          value={
            formatDuration(
              trace.summary.durationMs,
            )
          }
        />

        <TraceSummaryCard
          label="Steps"
          value={`${trace.summary.completedSteps}/${trace.summary.totalSteps}`}
        />

        <TraceSummaryCard
          label="Failed"
          value={String(
            trace.summary.failedSteps,
          )}
        />

        <TraceSummaryCard
          label="Retries"
          value={String(
            trace.summary.retryCount,
          )}
        />

        <TraceSummaryCard
          label="Recoveries"
          value={String(
            trace.summary.recoveryCount,
          )}
        />

        <TraceSummaryCard
          label="Tokens"
          value={
            trace.summary.tokenUsage.toLocaleString()
          }
        />

        <TraceSummaryCard
          label="Cost"
          value={
            formatCost(
              trace.summary.cost,
            )
          }
        />
      </div>

      <div
        style={{
          display:
            "grid",

          gap:
            "10px",
        }}
      >
        {trace.steps.map(
          (
            step,
            index,
          ) => {
            const expanded =
              expandedStepIds.has(
                step.stepRunId,
              );

            return (
              <article
                key={
                  step.stepRunId
                }
                style={{
                  border:
                    "1px solid rgba(148, 163, 184, 0.25)",

                  borderRadius:
                    "12px",

                  overflow:
                    "hidden",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    toggleStep(
                      step.stepRunId,
                    );
                  }}
                  style={{
                    width:
                      "100%",

                    display:
                      "grid",

                    gridTemplateColumns:
                      "minmax(180px, 1fr) repeat(4, minmax(90px, auto))",

                    alignItems:
                      "center",

                    gap:
                      "12px",

                    padding:
                      "14px 16px",

                    textAlign:
                      "left",

                    border:
                      "none",

                    cursor:
                      "pointer",
                  }}
                >
                  <div>
                    <strong>
                      {index +
                        1}
                      .{" "}
                      {
                        step.nodeName
                      }
                    </strong>

                    <div>
                      {
                        step.nodeType
                      }
                    </div>
                  </div>

                  <span>
                    {
                      getStatusLabel(
                        step.status,
                      )
                    }
                  </span>

                  <span>
                    {
                      getPolicyLabel(
                        step.policyDecision,
                      )
                    }
                  </span>

                  <span>
                    Risk:{" "}
                    {
                      getRiskLabel(
                        step.riskLevel,
                      )
                    }
                  </span>

                  <span>
                    {
                      formatDuration(
                        step.durationMs,
                      )
                    }
                  </span>
                </button>

                {expanded && (
                  <div
                    style={{
                      display:
                        "grid",

                      gap:
                        "16px",

                      padding:
                        "16px",

                      borderTop:
                        "1px solid rgba(148, 163, 184, 0.2)",
                    }}
                  >
                    <div
                      style={{
                        display:
                          "grid",

                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(160px, 1fr))",

                        gap:
                          "12px",
                      }}
                    >
                      <TraceDetail
                        label="Agent"
                        value={
                          step.agent?.name ??
                          "-"
                        }
                      />

                      <TraceDetail
                        label="Model"
                        value={
                          step.agent?.modelId ??
                          "-"
                        }
                      />

                      <TraceDetail
                        label="Policy"
                        value={
                          step.policyDecision
                        }
                      />

                      <TraceDetail
                        label="Risk"
                        value={
                          step.riskLevel
                        }
                      />

                      <TraceDetail
                        label="Approval"
                        value={
                          step.approvalStatus ??
                          "-"
                        }
                      />

                      <TraceDetail
                        label="Retry"
                        value={String(
                          step.retryCount,
                        )}
                      />

                      <TraceDetail
                        label="Recovery"
                        value={String(
                          step.recoveryCount,
                        )}
                      />

                      <TraceDetail
                        label="Tokens"
                        value={
                          step.tokenUsage.toLocaleString()
                        }
                      />

                      <TraceDetail
                        label="Cost"
                        value={
                          formatCost(
                            step.cost,
                          )
                        }
                      />

                      <TraceDetail
                        label="Duration"
                        value={
                          formatDuration(
                            step.durationMs,
                          )
                        }
                      />
                    </div>

                    <div>
                      <strong>
                        Tools
                      </strong>

                      {step.tools.length ===
                      0 ? (
                        <p>
                          사용 Tool 없음
                        </p>
                      ) : (
                        <ul>
                          {step.tools.map(
                            (
                              tool,
                            ) => (
                              <li
                                key={
                                  tool.id
                                }
                              >
                                {
                                  tool.name
                                }{" "}
                                (
                                {
                                  tool.type
                                }
                                )
                                {!tool.enabled &&
                                  " - Disabled"}
                              </li>
                            ),
                          )}
                        </ul>
                      )}
                    </div>

                    <div>
                      <strong>
                        Execution Logs
                      </strong>

                      {step.logs.length ===
                      0 ? (
                        <p>
                          기록된 로그가 없습니다.
                        </p>
                      ) : (
                        <div
                          style={{
                            display:
                              "grid",

                            gap:
                              "8px",

                            marginTop:
                              "8px",
                          }}
                        >
                          {step.logs.map(
                            (
                              log,
                            ) => (
                              <div
                                key={
                                  log.id
                                }
                                style={{
                                  padding:
                                    "10px",

                                  border:
                                    "1px solid rgba(148, 163, 184, 0.2)",

                                  borderRadius:
                                    "8px",
                                }}
                              >
                                <div>
                                  <strong>
                                    {
                                      log.level
                                    }
                                  </strong>

                                  {" · "}

                                  <span>
                                    {new Date(
                                      log.timestamp,
                                    ).toLocaleString()}
                                  </span>
                                </div>

                                <p>
                                  {
                                    log.message
                                  }
                                </p>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          },
        )}
      </div>
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
    <div
      style={{
        padding:
          "14px",

        border:
          "1px solid rgba(148, 163, 184, 0.25)",

        borderRadius:
          "10px",
      }}
    >
      <div>
        {label}
      </div>

      <strong>
        {value}
      </strong>
    </div>
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
    <div>
      <div>
        {label}
      </div>

      <strong>
        {value}
      </strong>
    </div>
  );
}