import {
  Trash2,
} from "lucide-react";

import type {
  WorkflowCondition,
  WorkflowEdge,
  WorkflowNode,
} from "../types";

import {
  getEnabledAgents,
  getEnabledModels,
  getEnabledTools,
} from "../../../data/catalogRepository";

interface StepSettingsPanelProps {
  node?: WorkflowNode;

  nodes: WorkflowNode[];

  edges: WorkflowEdge[];

  onNodeChange: (
    nodeId: string,
    updates: Partial<WorkflowNode>,
  ) => void;

  onEdgeChange: (
    edgeId: string,
    updates: Partial<WorkflowEdge>,
  ) => void;

  onDeleteNode: (
    nodeId: string,
  ) => void;
}

type ConditionOperator =
  WorkflowCondition["operator"];

const CONDITION_OPERATORS: Array<{
  value: ConditionOperator;
  label: string;
}> = [
  {
    value: "equals",
    label: "= Equals",
  },
  {
    value: "not_equals",
    label: "≠ Not Equals",
  },
  {
    value: "contains",
    label: "Contains",
  },
  {
    value: "gt",
    label: "> Greater Than",
  },
  {
    value: "gte",
    label: "≥ Greater Than or Equal",
  },
  {
    value: "lt",
    label: "< Less Than",
  },
  {
    value: "lte",
    label: "≤ Less Than or Equal",
  },
];

export function StepSettingsPanel({
  node,
  nodes,
  edges,
  onNodeChange,
  onEdgeChange,
  onDeleteNode,
}: StepSettingsPanelProps) {
  if (!node) {
    return (
      <aside className="step-settings">
        <div className="step-settings__header">
          <h2>
            Step Settings
          </h2>
        </div>

        <div className="step-settings__empty">
          Canvas에서 설정할 Node를 선택하세요.
        </div>
      </aside>
    );
  }

  const agents =
    getEnabledAgents();

  const models =
    getEnabledModels();

  const tools =
    getEnabledTools();

  const outgoingEdges =
    edges.filter(
      (
        edge,
      ) =>
        edge.source ===
        node.id,
    );

  const handleToolToggle = (
    toolId: string,
  ) => {
    const currentTools =
      node.toolIds ??
      [];

    const exists =
      currentTools.includes(
        toolId,
      );

    const nextTools =
      exists
        ? currentTools.filter(
            (
              currentToolId,
            ) =>
              currentToolId !==
              toolId,
          )
        : [
            ...currentTools,
            toolId,
          ];

    onNodeChange(
      node.id,
      {
        toolIds:
          nextTools,
      },
    );
  };

  const handleConditionFieldChange = (
    edge: WorkflowEdge,
    field: string,
  ) => {
    onEdgeChange(
      edge.id,
      {
        condition: {
          field,

          operator:
            edge.condition
              ?.operator ??
            "equals",

          value:
            edge.condition
              ?.value ??
            "",
        },
      },
    );
  };

  const handleConditionOperatorChange = (
    edge: WorkflowEdge,
    operator: ConditionOperator,
  ) => {
    onEdgeChange(
      edge.id,
      {
        condition: {
          field:
            edge.condition
              ?.field ??
            "",

          operator,

          value:
            edge.condition
              ?.value ??
            "",
        },
      },
    );
  };

  const handleConditionValueChange = (
    edge: WorkflowEdge,
    rawValue: string,
  ) => {
    onEdgeChange(
      edge.id,
      {
        condition: {
          field:
            edge.condition
              ?.field ??
            "",

          operator:
            edge.condition
              ?.operator ??
            "equals",

          value:
            parseConditionValue(
              rawValue,
            ),
        },
      },
    );
  };

  const handleFallbackChange = (
    edge: WorkflowEdge,
    fallback: boolean,
  ) => {
    if (
      fallback
    ) {
      onEdgeChange(
        edge.id,
        {
          condition:
            undefined,
        },
      );

      return;
    }

    onEdgeChange(
      edge.id,
      {
        condition: {
          field:
            "",

          operator:
            "equals",

          value:
            "",
        },
      },
    );
  };

  const getTargetNodeName = (
    edge: WorkflowEdge,
  ) => {
    const targetNode =
      nodes.find(
        (
          candidate,
        ) =>
          candidate.id ===
          edge.target,
      );

    return targetNode?.name ??
      edge.target;
  };

  return (
    <aside className="step-settings">
      <div className="step-settings__header">
        <h2>
          Step Settings
        </h2>

        <span
          className="step-settings__node-id"
          title={
            node.id
          }
        >
          {node.id}
        </span>
      </div>

      <div className="step-settings__content">
        <section className="settings-section">
          <div className="settings-section__header">
            <strong>
              General
            </strong>

            <p>
              Node의 기본 정보와 역할을 설정합니다.
            </p>
          </div>

          <div className="settings-field">
            <label htmlFor="workflow-node-name">
              Step Name
            </label>

            <input
              id="workflow-node-name"
              type="text"
              value={
                node.name
              }
              onChange={(
                event,
              ) => {
                onNodeChange(
                  node.id,
                  {
                    name:
                      event.target.value,
                  },
                );
              }}
            />
          </div>

          <div className="settings-field">
            <label htmlFor="workflow-node-type">
              Node Type
            </label>

            <input
              id="workflow-node-type"
              type="text"
              value={
                formatNodeType(
                  node.type,
                )
              }
              readOnly
            />
          </div>
        </section>

        {node.type ===
          "agent" && (
          <section className="settings-section">
            <div className="settings-section__header">
              <strong>
                Agent Configuration
              </strong>

              <p>
                실행할 Agent와 Model, 사용할 Tool을
                지정합니다.
              </p>
            </div>

            <div className="settings-field">
              <label htmlFor="workflow-node-agent">
                Agent
              </label>

              <select
                id="workflow-node-agent"
                value={
                  node.agentId ??
                  ""
                }
                onChange={(
                  event,
                ) => {
                  const agentId =
                    event.target.value ||
                    undefined;

                  const selectedAgent =
                    agents.find(
                      (
                        agent,
                      ) =>
                        agent.id ===
                        agentId,
                    );

                  onNodeChange(
                    node.id,
                    {
                      agentId,

                      modelId:
                        selectedAgent
                          ?.modelId ??
                        node.modelId,

                      toolIds:
                        selectedAgent
                          ? [
                              ...selectedAgent.toolIds,
                            ]
                          : node.toolIds,
                    },
                  );
                }}
              >
                <option value="">
                  Agent 선택
                </option>

                {agents.map(
                  (
                    agent,
                  ) => (
                    <option
                      key={
                        agent.id
                      }
                      value={
                        agent.id
                      }
                    >
                      {agent.name}
                    </option>
                  ),
                )}
              </select>

              {agents.length ===
                0 && (
                <p className="settings-field__hint">
                  현재 활성화된 Agent가 없습니다.
                </p>
              )}
            </div>

            <div className="settings-field">
              <label htmlFor="workflow-node-model">
                Model
              </label>

              <select
                id="workflow-node-model"
                value={
                  node.modelId ??
                  ""
                }
                onChange={(
                  event,
                ) => {
                  onNodeChange(
                    node.id,
                    {
                      modelId:
                        event.target.value ||
                        undefined,
                    },
                  );
                }}
              >
                <option value="">
                  Model 선택
                </option>

                {models.map(
                  (
                    model,
                  ) => (
                    <option
                      key={
                        model.id
                      }
                      value={
                        model.id
                      }
                    >
                      {model.displayName}
                    </option>
                  ),
                )}
              </select>

              {models.length ===
                0 && (
                <p className="settings-field__hint">
                  현재 활성화된 Model이 없습니다.
                </p>
              )}
            </div>

            <div className="settings-field">
              <label>
                Tools
              </label>

              {tools.length >
              0 ? (
                <div className="settings-tool-options">
                  {tools.map(
                    (
                      tool,
                    ) => {
                      const checked =
                        node.toolIds
                          ?.includes(
                            tool.id,
                          ) ??
                        false;

                      return (
                        <label
                          key={
                            tool.id
                          }
                          className="settings-tool-option"
                        >
                          <input
                            type="checkbox"
                            checked={
                              checked
                            }
                            onChange={() => {
                              handleToolToggle(
                                tool.id,
                              );
                            }}
                          />

                          <span>
                            {tool.name}
                          </span>
                        </label>
                      );
                    },
                  )}
                </div>
              ) : (
                <p className="settings-field__hint">
                  현재 활성화된 Tool이 없습니다.
                </p>
              )}
            </div>
          </section>
        )}

        {node.type ===
          "condition" && (
          <section className="settings-section">
            <div className="settings-section__header">
              <strong>
                Condition Branches
              </strong>

              <p>
                Shared State 값을 기준으로 각 실행 경로의
                조건을 설정합니다.
              </p>
            </div>

            {outgoingEdges.length ===
            0 ? (
              <div className="builder-validation-item builder-validation-item--warning">
                이 Condition Node에서 나가는 Edge가
                없습니다. Canvas에서 다음 Node로
                Branch를 연결하세요.
              </div>
            ) : (
              outgoingEdges.map(
                (
                  edge,
                  index,
                ) => {
                  const isFallback =
                    !edge.condition;

                  return (
                    <section
                      key={
                        edge.id
                      }
                      className="settings-section"
                    >
                      <div className="settings-section__header">
                        <strong>
                          Branch{" "}
                          {index +
                            1}
                        </strong>

                        <p
                          title={
                            edge.target
                          }
                        >
                          Target:{" "}
                          {getTargetNodeName(
                            edge,
                          )}
                        </p>
                      </div>

                      <label className="settings-tool-option">
                        <input
                          type="checkbox"
                          checked={
                            isFallback
                          }
                          onChange={(
                            event,
                          ) => {
                            handleFallbackChange(
                              edge,
                              event.target.checked,
                            );
                          }}
                        />

                        <span>
                          Default Branch
                        </span>
                      </label>

                      {isFallback ? (
                        <p className="settings-field__hint">
                          다른 조건과 일치하는 Branch가
                          없을 때 이 경로가 실행됩니다.
                        </p>
                      ) : (
                        <>
                          <div className="settings-field">
                            <label
                              htmlFor={`condition-field-${edge.id}`}
                            >
                              Field
                            </label>

                            <input
                              id={`condition-field-${edge.id}`}
                              type="text"
                              placeholder="예: score"
                              value={
                                edge.condition
                                  ?.field ??
                                ""
                              }
                              onChange={(
                                event,
                              ) => {
                                handleConditionFieldChange(
                                  edge,
                                  event.target.value,
                                );
                              }}
                            />

                            <p className="settings-field__hint">
                              비교할 Shared State Field를
                              입력하세요.
                            </p>
                          </div>

                          <div className="settings-field">
                            <label
                              htmlFor={`condition-operator-${edge.id}`}
                            >
                              Operator
                            </label>

                            <select
                              id={`condition-operator-${edge.id}`}
                              value={
                                edge.condition
                                  ?.operator ??
                                "equals"
                              }
                              onChange={(
                                event,
                              ) => {
                                handleConditionOperatorChange(
                                  edge,
                                  event.target
                                    .value as ConditionOperator,
                                );
                              }}
                            >
                              {CONDITION_OPERATORS.map(
                                (
                                  operator,
                                ) => (
                                  <option
                                    key={
                                      operator.value
                                    }
                                    value={
                                      operator.value
                                    }
                                  >
                                    {operator.label}
                                  </option>
                                ),
                              )}
                            </select>
                          </div>

                          <div className="settings-field">
                            <label
                              htmlFor={`condition-value-${edge.id}`}
                            >
                              Value
                            </label>

                            <input
                              id={`condition-value-${edge.id}`}
                              type="text"
                              placeholder="예: 0.8"
                              value={
                                formatConditionValue(
                                  edge.condition
                                    ?.value,
                                )
                              }
                              onChange={(
                                event,
                              ) => {
                                handleConditionValueChange(
                                  edge,
                                  event.target.value,
                                );
                              }}
                            />

                            <p className="settings-field__hint">
                              숫자와 true / false는 자동으로
                              해당 타입으로 변환됩니다.
                            </p>
                          </div>
                        </>
                      )}
                    </section>
                  );
                },
              )
            )}
          </section>
        )}

        {node.type !==
          "condition" && (
          <section className="settings-section">
            <div className="settings-section__header">
              <strong>
                Execution
              </strong>

              <p>
                Retry, Timeout 및 사용자 승인 정책을
                설정합니다.
              </p>
            </div>

            <div className="settings-field">
              <label htmlFor="workflow-node-retry">
                Retry Count
              </label>

              <select
                id="workflow-node-retry"
                value={
                  node.config
                    ?.retryCount ??
                  0
                }
                onChange={(
                  event,
                ) => {
                  onNodeChange(
                    node.id,
                    {
                      config: {
                        ...node.config,

                        retryCount:
                          Number(
                            event.target.value,
                          ),
                      },
                    },
                  );
                }}
              >
                <option value={0}>
                  재시도 없음
                </option>

                <option value={1}>
                  1회
                </option>

                <option value={2}>
                  2회
                </option>

                <option value={3}>
                  3회
                </option>
              </select>
            </div>

            <div className="settings-field">
              <label htmlFor="workflow-node-timeout">
                Timeout
              </label>

              <select
                id="workflow-node-timeout"
                value={
                  node.config
                    ?.timeoutSeconds ??
                  600
                }
                onChange={(
                  event,
                ) => {
                  onNodeChange(
                    node.id,
                    {
                      config: {
                        ...node.config,

                        timeoutSeconds:
                          Number(
                            event.target.value,
                          ),
                      },
                    },
                  );
                }}
              >
                <option value={60}>
                  1분
                </option>

                <option value={300}>
                  5분
                </option>

                <option value={600}>
                  10분
                </option>

                <option value={1800}>
                  30분
                </option>
              </select>
            </div>

            <div className="settings-row">
              <div>
                <strong>
                  Human Approval
                </strong>

                <p>
                  Node 완료 후 사용자의 승인을 받은 다음
                  실행을 계속합니다.
                </p>
              </div>

              <input
                type="checkbox"
                aria-label="Human Approval 사용"
                checked={
                  node.config
                    ?.requireApproval ??
                  false
                }
                onChange={(
                  event,
                ) => {
                  onNodeChange(
                    node.id,
                    {
                      config: {
                        ...node.config,

                        requireApproval:
                          event.target.checked,
                      },
                    },
                  );
                }}
              />
            </div>
          </section>
        )}

        <section className="settings-section">
          <div className="settings-section__header">
            <strong>
              Node ID
            </strong>

            <p>
              Workflow Runtime에서 사용하는 내부
              식별자입니다.
            </p>
          </div>

          <div className="tool-id-box">
            {node.id}
          </div>
        </section>

        <button
          type="button"
          className="danger-button"
          onClick={() => {
            const confirmed =
              window.confirm(
                `"${node.name}" Node를 삭제하시겠습니까?`,
              );

            if (
              confirmed
            ) {
              onDeleteNode(
                node.id,
              );
            }
          }}
        >
          <Trash2
            size={14}
          />

          Node 삭제
        </button>
      </div>
    </aside>
  );
}

function formatNodeType(
  type:
    WorkflowNode["type"],
) {
  switch (
    type
  ) {
    case "input":
      return "Input";

    case "agent":
      return "Agent";

    case "tool":
      return "Tool";

    case "condition":
      return "Condition";

    case "approval":
      return "Human Approval";

    case "output":
      return "Output";
  }
}

function parseConditionValue(
  value: string,
): unknown {
  const trimmed =
    value.trim();

  if (
    trimmed ===
    "true"
  ) {
    return true;
  }

  if (
    trimmed ===
    "false"
  ) {
    return false;
  }

  if (
    trimmed !==
      "" &&
    !Number.isNaN(
      Number(
        trimmed,
      ),
    )
  ) {
    return Number(
      trimmed,
    );
  }

  return value;
}

function formatConditionValue(
  value: unknown,
) {
  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return "";
  }

  if (
    typeof value ===
    "string"
  ) {
    return value;
  }

  if (
    typeof value ===
      "number" ||
    typeof value ===
      "boolean"
  ) {
    return String(
      value,
    );
  }

  try {
    return JSON.stringify(
      value,
    );
  } catch {
    return String(
      value,
    );
  }
}