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
    value:
      "equals",
    label:
      "= Equals",
  },
  {
    value:
      "not_equals",
    label:
      "≠ Not Equals",
  },
  {
    value:
      "contains",
    label:
      "Contains",
  },
  {
    value:
      "gt",
    label:
      "> Greater Than",
  },
  {
    value:
      "gte",
    label:
      "≥ Greater Than or Equal",
  },
  {
    value:
      "lt",
    label:
      "< Less Than",
  },
  {
    value:
      "lte",
    label:
      "≤ Less Than or Equal",
  },
];

export function StepSettingsPanel({
  node,
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
          설정할 Node를 선택하세요.
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
      /*
       * condition이 undefined인 Edge를
       * Backend에서 fallback/default branch로 본다.
       */
      onEdgeChange(
        edge.id,
        {
          condition:
            undefined,
        },
      );

      return;
    }

    /*
     * Default Branch를 해제하면
     * 기본 condition을 생성한다.
     */
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

  return (
    <aside className="step-settings">
      <div className="step-settings__header">
        <h2>
          Step Settings
        </h2>

        <span className="step-settings__node-id">
          {node.id}
        </span>
      </div>

      <div className="step-settings__tabs">
        <button
          type="button"
          className="step-settings__tab step-settings__tab--active"
        >
          General
        </button>

        <button
          type="button"
          className="step-settings__tab"
        >
          Input/Output
        </button>

        <button
          type="button"
          className="step-settings__tab"
        >
          Advanced
        </button>
      </div>

      <div className="step-settings__content">
        <div className="settings-field">
          <label>
            Step Name
          </label>

          <input
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
                    event.target
                      .value,
                },
              );
            }}
          />
        </div>

        <div className="settings-field">
          <label>
            Node Type
          </label>

          <input
            type="text"
            value={
              node.type
            }
            readOnly
          />
        </div>

        {node.type ===
          "agent" && (
          <>
            <div className="settings-field">
              <label>
                Agent
              </label>

              <select
                value={
                  node.agentId ??
                  ""
                }
                onChange={(
                  event,
                ) => {
                  const agentId =
                    event.target
                      .value ||
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
                      {
                        agent.name
                      }
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="settings-field">
              <label>
                Model
              </label>

              <select
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
                        event.target
                          .value ||
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
                      {
                        model.displayName
                      }
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="settings-field">
              <label>
                Tools
              </label>

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
                          onChange={() =>
                            handleToolToggle(
                              tool.id,
                            )
                          }
                        />

                        <span>
                          {
                            tool.name
                          }
                        </span>
                      </label>
                    );
                  },
                )}
              </div>
            </div>
          </>
        )}

        {node.type ===
          "condition" && (
          <div className="settings-field">
            <label>
              Condition Branches
            </label>

            {outgoingEdges.length ===
            0 ? (
              <p>
                이 Condition Node에서
                나가는 Edge가 없습니다.
                Canvas에서 Branch를
                연결하세요.
              </p>
            ) : (
              outgoingEdges.map(
                (
                  edge,
                  index,
                ) => {
                  const isFallback =
                    !edge.condition;

                  return (
                    <div
                      key={
                        edge.id
                      }
                      style={{
                        marginBottom:
                          "16px",

                        padding:
                          "12px",

                        border:
                          "1px solid rgba(148, 163, 184, 0.25)",

                        borderRadius:
                          "8px",
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",

                          justifyContent:
                            "space-between",

                          alignItems:
                            "center",

                          marginBottom:
                            "10px",
                        }}
                      >
                        <strong>
                          Branch{" "}
                          {
                            index +
                            1
                          }
                        </strong>

                        <span
                          style={{
                            fontSize:
                              "10px",

                            opacity:
                              0.65,
                          }}
                        >
                          →
                          {" "}
                          {
                            edge.target
                          }
                        </span>
                      </div>

                      <label
                        className="settings-tool-option"
                        style={{
                          marginBottom:
                            "10px",
                        }}
                      >
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
                              event
                                .target
                                .checked,
                            );
                          }}
                        />

                        <span>
                          Default Branch
                        </span>
                      </label>

                      {!isFallback && (
                        <>
                          <div className="settings-field">
                            <label>
                              Field
                            </label>

                            <input
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
                                  event
                                    .target
                                    .value,
                                );
                              }}
                            />
                          </div>

                          <div className="settings-field">
                            <label>
                              Operator
                            </label>

                            <select
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
                                  event
                                    .target
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
                                    {
                                      operator.label
                                    }
                                  </option>
                                ),
                              )}
                            </select>
                          </div>

                          <div className="settings-field">
                            <label>
                              Value
                            </label>

                            <input
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
                                  event
                                    .target
                                    .value,
                                );
                              }}
                            />
                          </div>
                        </>
                      )}

                      {isFallback && (
                        <p
                          style={{
                            margin:
                              0,

                            fontSize:
                              "11px",

                            opacity:
                              0.7,
                          }}
                        >
                          다른 조건에 맞는
                          Branch가 없을 때
                          이 경로가 실행됩니다.
                        </p>
                      )}
                    </div>
                  );
                },
              )
            )}
          </div>
        )}

        {node.type !==
          "condition" && (
          <>
            <div className="settings-field">
              <label>
                Retry Count
              </label>

              <select
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
                            event
                              .target
                              .value,
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
              <label>
                Timeout
              </label>

              <select
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
                            event
                              .target
                              .value,
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
                  실행 후 사용자
                  승인을 요청합니다.
                </p>
              </div>

              <input
                type="checkbox"
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
                          event.target
                            .checked,
                      },
                    },
                  );
                }}
              />
            </div>
          </>
        )}

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
            size={
              14
            }
          />

          Node 삭제
        </button>
      </div>
    </aside>
  );
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