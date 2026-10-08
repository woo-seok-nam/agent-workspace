import type { WorkflowNode } from "../types";

import { mockAgents } from "../../../mocks/agents";
import { mockModels } from "../../../mocks/models";
import { mockTools } from "../../../mocks/tools";

interface StepSettingsPanelProps {
  node?: WorkflowNode;

  onNodeChange: (
    nodeId: string,
    updates: Partial<WorkflowNode>,
  ) => void;
}

export function StepSettingsPanel({
  node,
  onNodeChange,
}: StepSettingsPanelProps) {
  if (!node) {
    return (
      <aside className="step-settings">
        <div className="step-settings__header">
          <h2>Step Settings</h2>
        </div>

        <div className="step-settings__empty">
          설정할 Node를 선택하세요.
        </div>
      </aside>
    );
  }

  const handleToolToggle = (
    toolId: string,
  ) => {
    const currentTools = node.toolIds ?? [];

    const exists = currentTools.includes(toolId);

    const nextTools = exists
      ? currentTools.filter(
          (currentToolId) =>
            currentToolId !== toolId,
        )
      : [...currentTools, toolId];

    onNodeChange(node.id, {
      toolIds: nextTools,
    });
  };

  return (
    <aside className="step-settings">
      <div className="step-settings__header">
        <h2>Step Settings</h2>

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
          <label htmlFor="step-name">
            Step Name
          </label>

          <input
            id="step-name"
            type="text"
            value={node.name}
            onChange={(event) => {
              onNodeChange(node.id, {
                name: event.target.value,
              });
            }}
          />
        </div>

        <div className="settings-field">
          <label>Node Type</label>

          <input
            type="text"
            value={node.type}
            readOnly
          />
        </div>

        {node.type === "agent" && (
          <>
            <div className="settings-field">
              <label htmlFor="step-agent">
                Agent
              </label>

              <select
                id="step-agent"
                value={node.agentId ?? ""}
                onChange={(event) => {
                  onNodeChange(node.id, {
                    agentId:
                      event.target.value ||
                      undefined,
                  });
                }}
              >
                <option value="">
                  Agent 선택
                </option>

                {mockAgents.map((agent) => (
                  <option
                    key={agent.id}
                    value={agent.id}
                  >
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="settings-field">
              <label htmlFor="step-model">
                Model
              </label>

              <select
                id="step-model"
                value={node.modelId ?? ""}
                onChange={(event) => {
                  onNodeChange(node.id, {
                    modelId:
                      event.target.value ||
                      undefined,
                  });
                }}
              >
                <option value="">
                  Model 선택
                </option>

                {mockModels.map((model) => (
                  <option
                    key={model.id}
                    value={model.id}
                  >
                    {model.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div className="settings-field">
              <label>Tools</label>

              <div className="settings-tool-options">
                {mockTools.map((tool) => {
                  const checked =
                    node.toolIds?.includes(
                      tool.id,
                    ) ?? false;

                  return (
                    <label
                      key={tool.id}
                      className="settings-tool-option"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          handleToolToggle(
                            tool.id,
                          )
                        }
                      />

                      <span>
                        {tool.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <div className="settings-field">
          <label htmlFor="step-retry">
            Retry Count
          </label>

          <select
            id="step-retry"
            value={
              node.config?.retryCount ?? 0
            }
            onChange={(event) => {
              onNodeChange(node.id, {
                config: {
                  ...node.config,

                  retryCount: Number(
                    event.target.value,
                  ),
                },
              });
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

            <option value={5}>
              5회
            </option>
          </select>
        </div>

        <div className="settings-field">
          <label htmlFor="step-timeout">
            Timeout
          </label>

          <select
            id="step-timeout"
            value={
              node.config?.timeoutSeconds ??
              600
            }
            onChange={(event) => {
              onNodeChange(node.id, {
                config: {
                  ...node.config,

                  timeoutSeconds: Number(
                    event.target.value,
                  ),
                },
              });
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
              실행 후 사용자 승인을
              요청합니다.
            </p>
          </div>

          <input
            type="checkbox"
            checked={
              node.config
                ?.requireApproval ?? false
            }
            onChange={(event) => {
              onNodeChange(node.id, {
                config: {
                  ...node.config,

                  requireApproval:
                    event.target.checked,
                },
              });
            }}
          />
        </div>
      </div>
    </aside>
  );
}