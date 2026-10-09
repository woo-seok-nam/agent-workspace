import {
  Bot,
  Save,
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

  onChange: (
    agent: Agent,
  ) => void;

  onSave: () => void;

  onDelete: () => void;
}

export function AgentEditor({
  agent,
  onChange,
  onSave,
  onDelete,
}: AgentEditorProps) {
  if (!agent) {
    return (
      <section className="agent-editor">
        <div className="agent-editor__empty">
          <div className="agent-editor__empty-icon">
            <Bot size={26} />
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

  const handleToolToggle = (
    toolId: string,
  ) => {
    const tool =
      tools.find(
        (item) =>
          item.id === toolId,
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
              id !== toolId,
          )
        : [
            ...agent.toolIds,
            toolId,
          ];

    onChange({
      ...agent,

      toolIds:
        nextToolIds,

      updatedAt:
        new Date().toISOString(),
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
        </div>

        <div className="agent-editor__header-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={
              onDelete
            }
          >
            <Trash2 size={14} />
            삭제
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={
              onSave
            }
          >
            <Save size={14} />
            저장
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
                  onChange({
                    ...agent,

                    name:
                      event.target
                        .value,

                    updatedAt:
                      new Date().toISOString(),
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
                  onChange({
                    ...agent,

                    description:
                      event.target
                        .value,

                    updatedAt:
                      new Date().toISOString(),
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
                  onChange({
                    ...agent,

                    modelId:
                      event.target
                        .value,

                    updatedAt:
                      new Date().toISOString(),
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
                    onChange({
                      ...agent,

                      enabled:
                        event.target
                          .checked,

                      updatedAt:
                        new Date().toISOString(),
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
                      .filter(Boolean)
                      .join(" ")}
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
                        {tool.name}
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