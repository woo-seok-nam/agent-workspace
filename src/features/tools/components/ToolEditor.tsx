import {
  Save,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import type {
  Tool,
  ToolType,
} from "../types";

interface ToolEditorProps {
  tool?: Tool;

  onChange: (
    tool: Tool,
  ) => void;

  onSave: () => void;
}

interface ToolPolicyInfo {
  capability: string;

  risk:
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | "CRITICAL";

  decision:
    | "ALLOW"
    | "REQUIRE_APPROVAL"
    | "DENY";
}

export function ToolEditor({
  tool,
  onChange,
  onSave,
}: ToolEditorProps) {
  if (
    !tool
  ) {
    return (
      <section className="tool-editor">
        <div className="tool-editor__empty">
          <div className="tool-editor__empty-icon">
            <Wrench
              size={25}
            />
          </div>

          <h2>
            Tool을 선택하세요
          </h2>

          <p>
            왼쪽 목록에서 설정할 Tool을
            선택하세요.
          </p>
        </div>
      </section>
    );
  }

  const policy =
    getToolPolicyInfo(
      tool.type,
    );

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
          className="tool-primary-button"
          onClick={
            onSave
          }
        >
          <Save
            size={14}
          />

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
              Tool의 기본 정보와 유형을 설정합니다.
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
                    event.target.value,
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
                    event.target.value,
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
              value={formatToolType(
                tool.type,
              )}
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
              Workflow Agent가 이 Tool을 사용할 수
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
                    event.target.checked,
                });
              }}
            />

            <div>
              <strong>
                Tool 활성화
              </strong>

              <span>
                비활성화된 Tool은 Agent 실행 시
                선택하거나 사용할 수 없습니다.
              </span>
            </div>
          </label>
        </section>

        <section className="tool-settings-section">
          <div className="tool-settings-section__heading">
            <h3>
              Permission & Policy
            </h3>

            <p>
              Runtime에서 이 Tool을 사용할 때 적용되는
              Capability와 기본 위험 정책입니다.
            </p>
          </div>

          <div className="tool-policy-grid">
            <div className="tool-policy-card">
              <span>
                Capability
              </span>

              <strong>
                {policy.capability}
              </strong>
            </div>

            <div className="tool-policy-card">
              <span>
                Risk Level
              </span>

              <span
                className={[
                  "tool-risk-badge",
                  `tool-risk-badge--${policy.risk.toLowerCase()}`,
                ].join(
                  " ",
                )}
              >
                {policy.risk}
              </span>
            </div>

            <div className="tool-policy-card">
              <span>
                Default Decision
              </span>

              <strong>
                {formatPolicyDecision(
                  policy.decision,
                )}
              </strong>
            </div>
          </div>
        </section>

        <section className="tool-settings-section">
          <div className="tool-settings-section__heading">
            <h3>
              Tool ID
            </h3>

            <p>
              Agent와 Workflow 내부에서 사용하는
              고유 식별자입니다.
            </p>
          </div>

          <div className="tool-id-box">
            {tool.id}
          </div>
        </section>

        <section className="tool-backend-notice">
          <strong>
            <ShieldCheck
              size={12}
            />{" "}
            Runtime Integration
          </strong>

          <p>
            Tool 설정은 Runtime Tool Executor와 연결되어
            실행됩니다. 위험도가 높은 Tool은 Permission /
            Policy 계층에서 사용자 승인을 요구할 수 있습니다.
          </p>
        </section>
      </div>
    </section>
  );
}

function getToolPolicyInfo(
  type: ToolType,
): ToolPolicyInfo {
  switch (
    type
  ) {
    case "web_search":
      return {
        capability:
          "WEB_SEARCH",

        risk:
          "LOW",

        decision:
          "ALLOW",
      };

    case "browser":
      return {
        capability:
          "BROWSER",

        risk:
          "MEDIUM",

        decision:
          "REQUIRE_APPROVAL",
      };

    case "file":
      return {
        capability:
          "FILE_ACCESS",

        risk:
          "MEDIUM",

        decision:
          "REQUIRE_APPROVAL",
      };

    case "api":
      return {
        capability:
          "EXTERNAL_API",

        risk:
          "HIGH",

        decision:
          "REQUIRE_APPROVAL",
      };

    case "code":
      return {
        capability:
          "CODE_EXECUTION",

        risk:
          "HIGH",

        decision:
          "REQUIRE_APPROVAL",
      };

    case "document_parser":
      return {
        capability:
          "DOCUMENT_PARSING",

        risk:
          "LOW",

        decision:
          "ALLOW",
      };
  }
}

function formatToolType(
  type: ToolType,
) {
  switch (
    type
  ) {
    case "web_search":
      return "Web Search";

    case "browser":
      return "Browser";

    case "file":
      return "File Access";

    case "api":
      return "External API";

    case "code":
      return "Code Execution";

    case "document_parser":
      return "Document Parser";
  }
}

function formatPolicyDecision(
  decision:
    ToolPolicyInfo["decision"],
) {
  switch (
    decision
  ) {
    case "ALLOW":
      return "Allow";

    case "REQUIRE_APPROVAL":
      return "Require Approval";

    case "DENY":
      return "Deny";
  }
}