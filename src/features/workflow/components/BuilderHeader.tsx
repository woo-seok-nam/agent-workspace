import {
  MoreHorizontal,
  Play,
  Save,
} from "lucide-react";

interface BuilderHeaderProps {
  workflowName: string;

  isDirty: boolean;

  saving: boolean;

  onSave: () => void;
}

export function BuilderHeader({
  workflowName,
  isDirty,
  saving,
  onSave,
}: BuilderHeaderProps) {
  return (
    <header className="builder-header">
      <div className="builder-header__left">
        <div className="builder-header__breadcrumb">
          <span>
            Workflows
          </span>

          <span>
            /
          </span>

          <strong>
            {workflowName}
          </strong>
        </div>

        <div className="builder-header__title-row">
          <h1>
            {workflowName}
          </h1>

          {isDirty && (
            <span className="builder-header__dirty">
              저장되지 않은 변경사항
            </span>
          )}
        </div>

        <div className="builder-header__tabs">
          <button
            type="button"
            className="builder-header__tab builder-header__tab--active"
          >
            Builder
          </button>

          <button
            type="button"
            className="builder-header__tab"
          >
            Settings
          </button>

          <button
            type="button"
            className="builder-header__tab"
          >
            Versions
          </button>
        </div>
      </div>

      <div className="builder-header__actions">
        <button
          type="button"
          className="secondary-button"
          onClick={
            onSave
          }
          disabled={
            saving ||
            !isDirty
          }
        >
          <Save size={14} />

          {saving
            ? "저장 중..."
            : "Save"}
        </button>

        <button
          type="button"
          className="builder-header__icon-button"
          aria-label="더보기"
        >
          <MoreHorizontal
            size={17}
          />
        </button>

        <button
          type="button"
          className="primary-button"
        >
          <Play size={14} />
          Run
        </button>
      </div>
    </header>
  );
}