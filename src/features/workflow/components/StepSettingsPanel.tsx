import type { WorkflowNode } from "../types";

interface StepSettingsPanelProps {
  node?: WorkflowNode;
}

export function StepSettingsPanel({
  node,
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

  return (
    <aside className="step-settings">
      <div className="step-settings__header">
        <h2>Step Settings</h2>

        <button
          type="button"
          className="step-settings__close"
          aria-label="설정 닫기"
        >
          ×
        </button>
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
          <label>Step Name</label>

          <input
            type="text"
            value={node.name}
            readOnly
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

        <div className="settings-field">
          <label>Agent</label>

          <input
            type="text"
            value={node.agentId ?? "없음"}
            readOnly
          />
        </div>

        <div className="settings-field">
          <label>Model</label>

          <input
            type="text"
            value={node.modelId ?? "없음"}
            readOnly
          />
        </div>

        <div className="settings-field">
          <label>Tools</label>

          {node.toolIds && node.toolIds.length > 0 ? (
            <div className="settings-tool-list">
              {node.toolIds.map((toolId) => (
                <span key={toolId}>
                  {toolId}
                </span>
              ))}
            </div>
          ) : (
            <input
              type="text"
              value="사용 중인 Tool 없음"
              readOnly
            />
          )}
        </div>

        <div className="settings-field">
          <label>Retry Count</label>

          <input
            type="text"
            value={node.config?.retryCount ?? 0}
            readOnly
          />
        </div>

        <div className="settings-field">
          <label>Timeout</label>

          <input
            type="text"
            value={
              node.config?.timeoutSeconds
                ? `${node.config.timeoutSeconds}초`
                : "설정 없음"
            }
            readOnly
          />
        </div>

        <div className="settings-row">
          <span>Require Human Approval</span>

          <input
            type="checkbox"
            checked={
              node.config?.requireApproval ?? false
            }
            readOnly
          />
        </div>
      </div>
    </aside>
  );
}