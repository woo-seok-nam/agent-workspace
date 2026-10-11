import {
  Bot,
  Circle,
  Trash2,
} from "lucide-react";

import type {
  Agent,
} from "../types";

import {
  getModels,
  getTools,
} from "../../../data/catalogRepository";

interface AgentEditorProps {
  agent?: Agent;

  isDirty?: boolean;

  onChange: (
    agent: Agent,
  ) => void;

  onDelete: () => void;
}

export function AgentEditor({
  agent,
  isDirty = false,
  onChange,
  onDelete,
}: AgentEditorProps) {
  if (!agent) {
    return (
      <section className="agent-editor">
        <div className="agent-editor__empty">
          <div className="agent-editor__empty-icon">
            <Bot
              size={
                26
              }
            />
          </div>

          <h2>
            Agent를 선택하세요
          </h2>

          <p>
            왼쪽 Agent 목록에서
            설정할 Agent를 선택하거나
            새로운 Agent를 생성하세요.
          </p>
        </div>
      </section>
    );
  }

  const models =
    getModels();

  const tools =
    getTools();

  const updateAgent = (
    updates: Partial<Agent>,
  ) => {
    onChange({
      ...agent,

      ...updates,

      updatedAt:
        new Date().toISOString(),
    });
  };

  const handleToolToggle = (
    toolId: string,
  ) => {
    const tool =
      tools.find(
        (item) =>
          item.id ===
          toolId,
      );

    if (
      !tool?.enabled &&
      !agent.toolIds.includes(
        toolId,
      )
    ) {
      return;
    }

    const hasTool =
      agent.toolIds.includes(
        toolId,
      );

    const nextToolIds =
      hasTool
        ? agent.toolIds.filter(
            (id) =>
              id !==
              toolId,
          )
        : [
            ...agent.toolIds,

            toolId,
          ];

    updateAgent({
      toolIds:
        nextToolIds,
    });
  };

  return (
    <section className="agent-editor">
      <div className="agent-editor__header">
        <div>
          <span>
            Agent Configuration
          </span>

          <h2>
            {agent.name}
          </h2>

          {isDirty && (
            <div
              style={{
                display:
                  "inline-flex",

                alignItems:
                  "center",

                gap:
                  "5px",

                marginTop:
                  "6px",

                color:
                  "#b45309",

                fontSize:
                  "10px",

                fontWeight:
                  700,
              }}
            >
              <Circle
                size={
                  7
                }
                fill="currentColor"
              />

              저장되지 않은 변경사항
            </div>
          )}
        </div>

        <div className="agent-editor__header-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={
              onDelete
            }
          >
            <Trash2
              size={
                14
              }
            />

            삭제
          </button>
        </div>
      </div>

      <div className="agent-editor__body">
        <section className="agent-settings-section">
          <div className="agent-settings-section__heading">
            <h3>
              General
            </h3>

            <p>
              Agent의 기본 정보를
              설정합니다.
            </p>
          </div>

          <div className="agent-form-grid">
            <div className="agent-form-field agent-form-field--full">
              <label htmlFor="agent-name">
                Agent Name
              </label>

              <input
                id="agent-name"
                type="text"
                value={
                  agent.name
                }
                onChange={(
                  event,
                ) => {
                  updateAgent({
                    name:
                      event.target
                        .value,
                  });
                }}
              />
            </div>

            <div className="agent-form-field agent-form-field--full">
              <label htmlFor="agent-description">
                Description
              </label>

              <textarea
                id="agent-description"
                value={
                  agent.description ??
                  ""
                }
                onChange={(
                  event,
                ) => {
                  updateAgent({
                    description:
                      event.target
                        .value,
                  });
                }}
              />
            </div>

            <div className="agent-form-field">
              <label htmlFor="agent-model">
                Model
              </label>

              <select
                id="agent-model"
                value={
                  agent.modelId
                }
                onChange={(
                  event,
                ) => {
                  updateAgent({
                    modelId:
                      event.target
                        .value,
                  });
                }}
              >
                {models.map(
                  (model) => (
                    <option
                      key={
                        model.id
                      }
                      value={
                        model.id
                      }
                      disabled={
                        !model.enabled
                      }
                    >
                      {
                        model.displayName
                      }
                      {" · "}
                      {
                        model.provider
                      }
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="agent-form-field">
              <label>
                Status
              </label>

              <label className="agent-enabled-control">
                <input
                  type="checkbox"
                  checked={
                    agent.enabled
                  }
                  onChange={(
                    event,
                  ) => {
                    updateAgent({
                      enabled:
                        event.target
                          .checked,
                    });
                  }}
                />

                <div>
                  <strong>
                    Agent 활성화
                  </strong>

                  <span>
                    비활성화하면
                    Workflow에서 사용할
                    수 없습니다.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </section>

        <section className="agent-settings-section">
          <div className="agent-settings-section__heading">
            <h3>
              System Prompt
            </h3>

            <p>
              Agent의 역할과 행동 원칙을
              정의합니다.
            </p>
          </div>

          <div className="agent-form-grid">
            <div className="agent-form-field agent-form-field--full">
              <label htmlFor="agent-system-prompt">
                System Prompt
              </label>

              <textarea
                id="agent-system-prompt"
                value={
                  agent.systemPrompt ??
                  ""
                }
                rows={
                  8
                }
                placeholder={
                  [
                    "예:",
                    "You are a professional research agent.",
                    "Verify important claims before answering.",
                    "Use concise and structured responses.",
                  ].join(
                    "\n",
                  )
                }
                onChange={(
                  event,
                ) => {
                  updateAgent({
                    systemPrompt:
                      event.target
                        .value,
                  });
                }}
                style={{
                  minHeight:
                    "180px",

                  resize:
                    "vertical",
                }}
              />

              <span
                style={{
                  marginTop:
                    "6px",

                  fontSize:
                    "11px",

                  color:
                    "#64748b",

                  lineHeight:
                    1.5,
                }}
              >
                이 Prompt는 Workflow 실행 시
                Runtime System Prompt보다 먼저
                적용됩니다.
              </span>
            </div>
          </div>
        </section>

        <section className="agent-settings-section">
          <div className="agent-settings-section__heading">
            <h3>
              Execution Settings
            </h3>

            <p>
              모델 생성 옵션과 Agent의
              기본 실행 정책을 설정합니다.
            </p>
          </div>

          <div className="agent-form-grid">
            <div className="agent-form-field">
              <label htmlFor="agent-temperature">
                Temperature
              </label>

              <input
                id="agent-temperature"
                type="number"
                min={
                  0
                }
                max={
                  2
                }
                step={
                  0.1
                }
                value={
                  agent.temperature ??
                  0.2
                }
                onChange={(
                  event,
                ) => {
                  const value =
                    Number(
                      event.target
                        .value,
                    );

                  updateAgent({
                    temperature:
                      Number.isFinite(
                        value,
                      )
                        ? Math.min(
                            2,
                            Math.max(
                              0,
                              value,
                            ),
                          )
                        : 0.2,
                  });
                }}
              />

              <span
                style={{
                  marginTop:
                    "5px",

                  fontSize:
                    "11px",

                  color:
                    "#64748b",
                }}
              >
                낮을수록 일관적이고,
                높을수록 다양한 결과를
                생성합니다. 권장값: 0.2
              </span>
            </div>

            <div className="agent-form-field">
              <label htmlFor="agent-max-tokens">
                Max Tokens
              </label>

              <input
                id="agent-max-tokens"
                type="number"
                min={
                  1
                }
                step={
                  256
                }
                value={
                  agent.maxTokens ??
                  4096
                }
                onChange={(
                  event,
                ) => {
                  const value =
                    Number(
                      event.target
                        .value,
                    );

                  updateAgent({
                    maxTokens:
                      Number.isFinite(
                        value,
                      ) &&
                      value >
                        0
                        ? Math.floor(
                            value,
                          )
                        : 4096,
                  });
                }}
              />

              <span
                style={{
                  marginTop:
                    "5px",

                  fontSize:
                    "11px",

                  color:
                    "#64748b",
                }}
              >
                한 번의 모델 실행에서
                생성할 최대 출력 Token 수입니다.
              </span>
            </div>

            <div className="agent-form-field">
              <label htmlFor="agent-retry-count">
                Retry Count
              </label>

              <input
                id="agent-retry-count"
                type="number"
                min={
                  0
                }
                max={
                  10
                }
                step={
                  1
                }
                value={
                  agent.retryCount ??
                  2
                }
                onChange={(
                  event,
                ) => {
                  const value =
                    Number(
                      event.target
                        .value,
                    );

                  updateAgent({
                    retryCount:
                      Number.isFinite(
                        value,
                      )
                        ? Math.min(
                            10,
                            Math.max(
                              0,
                              Math.floor(
                                value,
                              ),
                            ),
                          )
                        : 2,
                  });
                }}
              />

              <span
                style={{
                  marginTop:
                    "5px",

                  fontSize:
                    "11px",

                  color:
                    "#64748b",
                }}
              >
                일시적인 API 오류가 발생했을
                때 재시도하는 기본 횟수입니다.
              </span>
            </div>

            <div className="agent-form-field">
              <label htmlFor="agent-timeout">
                Timeout
              </label>

              <select
                id="agent-timeout"
                value={
                  agent.timeoutSeconds ??
                  60
                }
                onChange={(
                  event,
                ) => {
                  updateAgent({
                    timeoutSeconds:
                      Number(
                        event.target
                          .value,
                      ),
                  });
                }}
              >
                <option value={0}>
                  제한 없음
                </option>

                <option value={30}>
                  30초
                </option>

                <option value={60}>
                  1분
                </option>

                <option value={120}>
                  2분
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

              <span
                style={{
                  marginTop:
                    "5px",

                  fontSize:
                    "11px",

                  color:
                    "#64748b",
                }}
              >
                Workflow Node에 별도 Timeout이
                있으면 Node 설정이 우선됩니다.
              </span>
            </div>
          </div>

          <div
            style={{
              marginTop:
                "18px",

              padding:
                "12px 14px",

              border:
                "1px solid #e2e8f0",

              borderRadius:
                "8px",

              background:
                "#f8fafc",

              fontSize:
                "11px",

              color:
                "#475569",

              lineHeight:
                1.6,
            }}
          >
            <strong
              style={{
                display:
                  "block",

                marginBottom:
                  "4px",

                color:
                  "#334155",
              }}
            >
              Workflow 실행 설정 우선순위
            </strong>

            Retry와 Timeout은
            {" "}
            <strong>
              Workflow Node 설정
            </strong>
            {" → "}
            <strong>
              Agent 기본 설정
            </strong>
            {" → "}
            <strong>
              시스템 기본값
            </strong>
            {" "}
            순서로 결정됩니다.
          </div>
        </section>

        <section className="agent-settings-section">
          <div className="agent-settings-section__heading">
            <h3>
              Tools
            </h3>

            <p>
              Agent가 사용할 수 있는
              Tool을 선택합니다.
            </p>
          </div>

          <div className="agent-tool-grid">
            {tools.map(
              (tool) => {
                const checked =
                  agent.toolIds.includes(
                    tool.id,
                  );

                return (
                  <label
                    key={
                      tool.id
                    }
                    className={[
                      "agent-tool-card",

                      checked
                        ? "agent-tool-card--selected"
                        : "",

                      !tool.enabled
                        ? "agent-tool-card--disabled"
                        : "",
                    ]
                      .filter(
                        Boolean,
                      )
                      .join(
                        " ",
                      )}
                  >
                    <input
                      type="checkbox"
                      checked={
                        checked
                      }
                      disabled={
                        !tool.enabled &&
                        !checked
                      }
                      onChange={() =>
                        handleToolToggle(
                          tool.id,
                        )
                      }
                    />

                    <div>
                      <strong>
                        {
                          tool.name
                        }
                      </strong>

                      <span>
                        {tool.enabled
                          ? tool.description ??
                            tool.type
                          : "비활성화된 Tool"}
                      </span>
                    </div>
                  </label>
                );
              },
            )}
          </div>
        </section>

        <section className="agent-settings-section">
          <div className="agent-settings-section__heading">
            <h3>
              Agent ID
            </h3>

            <p>
              Workflow Node가 Agent를
              참조할 때 사용하는
              내부 식별자입니다.
            </p>
          </div>

          <div className="agent-id-box">
            {agent.id}
          </div>
        </section>
      </div>
    </section>
  );
}