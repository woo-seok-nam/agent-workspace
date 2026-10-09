import {
  Save,
  Wrench,
} from "lucide-react";

import type {
  Tool,
} from "../types";

interface ToolEditorProps {
  tool?: Tool;

  onChange: (
    tool: Tool,
  ) => void;

  onSave: () => void;
}

export function ToolEditor({
  tool,
  onChange,
  onSave,
}: ToolEditorProps) {
  if (!tool) {
    return (
      <section className="tool-editor">
        <div className="tool-editor__empty">
          <div className="tool-editor__empty-icon">
            <Wrench size={25} />
          </div>

          <h2>
            Tool을 선택하세요
          </h2>

          <p>
            왼쪽 목록에서 설정할
            Tool을 선택하세요.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="tool-editor">
      <div className="tool-editor__header">
        <div>
          <span>
            Tool Configuration
          </span>

          <h2>
            {tool.name}
          </h2>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={onSave}
        >
          <Save size={14} />
          저장
        </button>
      </div>

      <div className="tool-editor__body">
        <section className="tool-settings-section">
          <div className="tool-settings-section__heading">
            <h3>
              General
            </h3>

            <p>
              Tool의 기본 정보를
              설정합니다.
            </p>
          </div>

          <div className="tool-form-field">
            <label htmlFor="tool-name">
              Tool Name
            </label>

            <input
              id="tool-name"
              type="text"
              value={
                tool.name
              }
              onChange={(
                event,
              ) => {
                onChange({
                  ...tool,

                  name:
                    event.target
                      .value,
                });
              }}
            />
          </div>

          <div className="tool-form-field">
            <label htmlFor="tool-description">
              Description
            </label>

            <textarea
              id="tool-description"
              value={
                tool.description ??
                ""
              }
              onChange={(
                event,
              ) => {
                onChange({
                  ...tool,

                  description:
                    event.target
                      .value,
                });
              }}
            />
          </div>

          <div className="tool-form-field">
            <label>
              Tool Type
            </label>

            <input
              type="text"
              value={
                tool.type
              }
              readOnly
            />
          </div>
        </section>

        <section className="tool-settings-section">
          <div className="tool-settings-section__heading">
            <h3>
              Availability
            </h3>

            <p>
              Workflow Agent가 이
              Tool을 사용할 수
              있는지 설정합니다.
            </p>
          </div>

          <label className="tool-enabled-control">
            <input
              type="checkbox"
              checked={
                tool.enabled
              }
              onChange={(
                event,
              ) => {
                onChange({
                  ...tool,

                  enabled:
                    event.target
                      .checked,
                });
              }}
            />

            <div>
              <strong>
                Tool 활성화
              </strong>

              <span>
                비활성화된 Tool은
                Agent 실행 시 사용할
                수 없습니다.
              </span>
            </div>
          </label>
        </section>

        <section className="tool-settings-section">
          <div className="tool-settings-section__heading">
            <h3>
              Tool ID
            </h3>

            <p>
              Agent와 Workflow에서
              사용하는 내부
              식별자입니다.
            </p>
          </div>

          <div className="tool-id-box">
            {tool.id}
          </div>
        </section>

        <section className="tool-backend-notice">
          <strong>
            Backend Integration
          </strong>

          <p>
            현재는 Tool의 설정 정보만
            관리합니다. 실제 Web Search,
            Browser, File, API, Code
            Execution은 Backend Tool
            Executor와 연결할 예정입니다.
          </p>
        </section>
      </div>
    </section>
  );
}