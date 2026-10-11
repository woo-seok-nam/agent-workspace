import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock3,
  Coins,
  Copy,
  FileText,
  Workflow as WorkflowIcon,
} from "lucide-react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  fetchRun,
} from "../api/runs";

import {
  fetchWorkflow,
} from "../api/workflows";

import type {
  StepRun,
  WorkflowRun,
} from "../features/runs/types";

import type {
  Workflow,
  WorkflowNode,
} from "../features/workflow/types";

import "../features/workspace/WorkspaceResult.css";

interface AgentExecutionOutput {
  text?: string;

  agentId?: string;

  agentName?: string;

  provider?: string;

  modelId?: string;

  inputTokens?: number;

  outputTokens?: number;

  totalTokens?: number;

  tools?: unknown[];
}

export function WorkspaceResultPage() {
  const navigate =
    useNavigate();

  const {
    runId,
  } =
    useParams();

  const [
    run,
    setRun,
  ] =
    useState<
      WorkflowRun | null
    >(null);

  const [
    workflow,
    setWorkflow,
  ] =
    useState<
      Workflow | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    copied,
    setCopied,
  ] =
    useState(false);

  useEffect(() => {
    if (!runId) {
      setError(
        "Run ID가 없습니다.",
      );

      setLoading(false);

      return;
    }

    const currentRunId =
      runId;

    let cancelled =
      false;

    async function loadResult() {
      try {
        setLoading(
          true,
        );

        setError(
          null,
        );

        const runData =
          await fetchRun(
            currentRunId,
          );

        const workflowData =
          await fetchWorkflow(
            runData.workflowId,
          );

        if (cancelled) {
          return;
        }

        setRun(
          runData,
        );

        setWorkflow(
          workflowData,
        );
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "실행 결과를 불러오지 못했습니다.",
        );
      } finally {
        if (!cancelled) {
          setLoading(
            false,
          );
        }
      }
    }

    void loadResult();

    return () => {
      cancelled =
        true;
    };
  }, [
    runId,
  ]);

  const finalResult =
    useMemo(() => {
      if (
        !run ||
        !workflow
      ) {
        return undefined;
      }

      return findFinalResult(
        workflow,
        run.stepRuns,
      );
    }, [
      run,
      workflow,
    ]);

  const completedSteps =
    useMemo(() => {
      if (
        !run ||
        !workflow
      ) {
        return [];
      }

      return run.stepRuns
        .filter(
          (stepRun) =>
            stepRun.status ===
            "COMPLETED",
        )
        .map(
          (stepRun) => {
            const node =
              workflow.nodes.find(
                (
                  workflowNode,
                ) =>
                  workflowNode.id ===
                  stepRun.nodeId,
              );

            return {
              stepRun,

              node,
            };
          })
        .filter(
          (
            item,
          ): item is {
            stepRun: StepRun;
            node: WorkflowNode;
          } =>
            Boolean(
              item.node,
            ),
        );
    }, [
      run,
      workflow,
    ]);

  async function handleCopy() {
    const text =
      finalResult?.text;

    if (!text) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        text,
      );

      setCopied(
        true,
      );

      window.setTimeout(
        () => {
          setCopied(
            false,
          );
        },
        1500,
      );
    } catch {
      window.alert(
        "결과를 클립보드에 복사하지 못했습니다.",
      );
    }
  }

  if (loading) {
    return (
      <div className="workspace-result-page">
        결과를 불러오는 중입니다...
      </div>
    );
  }

  if (error) {
    return (
      <div className="workspace-result-page">
        <h1>
          Workspace
        </h1>

        <p>
          {error}
        </p>
      </div>
    );
  }

  if (
    !run ||
    !workflow
  ) {
    return (
      <div className="workspace-result-page">
        실행 결과를 찾을 수 없습니다.
      </div>
    );
  }

  const duration =
    getRunDuration(
      run.startedAt,
      run.completedAt,
    );

  return (
    <div className="workspace-result-page">
      <header className="workspace-result-header">
        <div>
          <button
            type="button"
            className="workspace-back-button"
            onClick={() => {
              navigate(
                `/runs/${run.id}`,
              );
            }}
          >
            <ArrowLeft
              size={16}
            />

            Runtime으로 돌아가기
          </button>

          <div className="workspace-result-heading">
            <span>
              Workspace Result
            </span>

            <h1>
              {run.name}
            </h1>

            <p>
              {workflow.name}
            </p>
          </div>
        </div>

        <div
          className={[
            "workspace-result-status",
            `workspace-result-status--${run.status.toLowerCase()}`,
          ].join(" ")}
        >
          <CheckCircle2
            size={15}
          />

          {getStatusLabel(
            run.status,
          )}
        </div>
      </header>

      {run.status !==
        "COMPLETED" && (
        <div className="workspace-result-notice">
          이 Run은 아직 완료되지 않았습니다.
          현재까지 생성된 결과만 표시합니다.
        </div>
      )}

      <section className="workspace-result-stats">
        <ResultStat
          icon={
            WorkflowIcon
          }
          label="Workflow"
          value={
            workflow.name
          }
        />

        <ResultStat
          icon={Bot}
          label="Completed Steps"
          value={`${completedSteps.length} / ${run.stepRuns.length}`}
        />

        <ResultStat
          icon={Clock3}
          label="Duration"
          value={
            duration
          }
        />

        <ResultStat
          icon={Coins}
          label="Token / Cost"
          value={`${run.tokenUsage ?? 0} tokens / $${(
            run.cost ?? 0
          ).toFixed(2)}`}
        />
      </section>

      <div className="workspace-result-layout">
        <main className="workspace-result-main">
          <section className="workspace-result-card">
            <div className="workspace-result-card__header">
              <div>
                <span className="workspace-result-eyebrow">
                  Final Result
                </span>

                <h2>
                  최종 결과
                </h2>
              </div>

              <button
                type="button"
                className="workspace-copy-button"
                disabled={
                  !finalResult?.text
                }
                onClick={() => {
                  void handleCopy();
                }}
              >
                <Copy
                  size={15}
                />

                {copied
                  ? "복사됨"
                  : "복사"}
              </button>
            </div>

            {finalResult?.text ? (
              <div className="workspace-result-content">
                {finalResult.text}
              </div>
            ) : (
              <div className="workspace-result-empty">
                <FileText
                  size={28}
                />

                <strong>
                  아직 최종 결과가 없습니다.
                </strong>

                <p>
                  Workflow가 완료되면 마지막
                  Step의 결과가 여기에
                  표시됩니다.
                </p>
              </div>
            )}

            {finalResult && (
              <footer className="workspace-result-meta">
                <span>
                  생성 Step:
                  {" "}
                  <strong>
                    {
                      finalResult
                        .node
                        .name
                    }
                  </strong>
                </span>

                {finalResult.output
                  ?.agentName && (
                  <span>
                    Agent:
                    {" "}
                    <strong>
                      {
                        finalResult
                          .output
                          .agentName
                      }
                    </strong>
                  </span>
                )}

                {finalResult.output
                  ?.modelId && (
                  <span>
                    Model:
                    {" "}
                    <strong>
                      {
                        finalResult
                          .output
                          .modelId
                      }
                    </strong>
                  </span>
                )}
              </footer>
            )}
          </section>

          <section className="workspace-result-card">
            <div className="workspace-result-card__header">
              <div>
                <span className="workspace-result-eyebrow">
                  Original Prompt
                </span>

                <h2>
                  사용자 요청
                </h2>
              </div>
            </div>

            <div className="workspace-original-prompt">
              {run.prompt ??
                "저장된 Prompt가 없습니다."}
            </div>
          </section>
        </main>

        <aside className="workspace-result-sidebar">
          <div className="workspace-result-sidebar__header">
            <span>
              Execution Outputs
            </span>

            <strong>
              {completedSteps.length}
            </strong>
          </div>

          <div className="workspace-step-results">
            {completedSteps.length >
            0 ? (
              completedSteps.map(
                ({
                  stepRun,
                  node,
                }) => {
                  const output =
                    getAgentOutput(
                      stepRun.output,
                    );

                  return (
                    <article
                      key={
                        stepRun.id
                      }
                      className="workspace-step-result"
                    >
                      <div className="workspace-step-result__header">
                        <div>
                          <CheckCircle2
                            size={14}
                          />

                          <strong>
                            {
                              node.name
                            }
                          </strong>
                        </div>

                        <span>
                          {
                            stepRun.tokenUsage ??
                            0
                          }
                          {" "}
                          tokens
                        </span>
                      </div>

                      {output?.agentName && (
                        <p className="workspace-step-result__agent">
                          {
                            output.agentName
                          }
                          {output.modelId
                            ? ` · ${output.modelId}`
                            : ""}
                        </p>
                      )}

                      <p className="workspace-step-result__preview">
                        {getOutputPreview(
                          output?.text,
                        )}
                      </p>
                    </article>
                  );
                },
              )
            ) : (
              <p className="workspace-result-sidebar__empty">
                완료된 Step이 없습니다.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

interface ResultStatProps {
  icon:
    typeof WorkflowIcon;

  label: string;

  value: string;
}

function ResultStat({
  icon: Icon,
  label,
  value,
}: ResultStatProps) {
  return (
    <article className="workspace-result-stat">
      <div className="workspace-result-stat__icon">
        <Icon
          size={17}
        />
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

function findFinalResult(
  workflow: Workflow,
  stepRuns: StepRun[],
) {
  const outputNodeIds =
    new Set(
      workflow.nodes
        .filter(
          (node) =>
            node.type ===
            "output",
        )
        .map(
          (node) =>
            node.id,
        ),
    );

  const finalSourceNodeIds =
    workflow.edges
      .filter(
        (edge) =>
          outputNodeIds.has(
            edge.target,
          ),
      )
      .map(
        (edge) =>
          edge.source,
      );

  for (
    const nodeId
    of finalSourceNodeIds
  ) {
    const stepRun =
      stepRuns.find(
        (step) =>
          step.nodeId ===
            nodeId &&
          step.status ===
            "COMPLETED",
      );

    const node =
      workflow.nodes.find(
        (
          workflowNode,
        ) =>
          workflowNode.id ===
          nodeId,
      );

    if (
      stepRun &&
      node
    ) {
      const output =
        getAgentOutput(
          stepRun.output,
        );

      if (
        output?.text
      ) {
        return {
          stepRun,

          node,

          output,

          text:
            output.text,
        };
      }
    }
  }

  /*
   * Output Node 연결을 찾을 수 없는 Workflow도
   * 최대한 결과를 보여줄 수 있도록 fallback한다.
   */
  for (
    let index =
      stepRuns.length -
      1;
    index >= 0;
    index -= 1
  ) {
    const stepRun =
      stepRuns[
        index
      ];

    if (
      !stepRun ||
      stepRun.status !==
        "COMPLETED"
    ) {
      continue;
    }

    const output =
      getAgentOutput(
        stepRun.output,
      );

    if (!output?.text) {
      continue;
    }

    const node =
      workflow.nodes.find(
        (
          workflowNode,
        ) =>
          workflowNode.id ===
          stepRun.nodeId,
      );

    if (!node) {
      continue;
    }

    return {
      stepRun,

      node,

      output,

      text:
        output.text,
    };
  }

  return undefined;
}

function getAgentOutput(
  output: unknown,
): AgentExecutionOutput | undefined {
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

  return output as AgentExecutionOutput;
}

function getOutputPreview(
  text:
    | string
    | undefined,
) {
  if (!text) {
    return "텍스트 결과가 없습니다.";
  }

  const normalized =
    text
      .replace(
        /\s+/g,
        " ",
      )
      .trim();

  if (
    normalized.length <=
    120
  ) {
    return normalized;
  }

  return `${normalized.slice(
    0,
    120,
  )}...`;
}

function getRunDuration(
  startedAt:
    | string
    | undefined,
  completedAt:
    | string
    | undefined,
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
      seconds / 60,
    );

  const remainingSeconds =
    seconds %
    60;

  if (
    minutes <
    60
  ) {
    return `${minutes}분 ${remainingSeconds}초`;
  }

  const hours =
    Math.floor(
      minutes / 60,
    );

  return `${hours}시간 ${minutes % 60}분`;
}

function getStatusLabel(
  status:
    WorkflowRun["status"],
) {
  switch (status) {
    case "COMPLETED":
      return "완료";

    case "RUNNING":
      return "실행 중";

    case "WAITING_APPROVAL":
      return "승인 대기";

    case "FAILED":
      return "실패";

    case "CANCELLED":
      return "취소됨";

    case "QUEUED":
      return "실행 대기";

    case "PAUSED":
      return "일시 중지";

    case "IDLE":
      return "대기";

    default:
      return status;
  }
}