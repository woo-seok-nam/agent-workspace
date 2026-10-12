import {
  CheckCircle2,
  Play,
  Save,
} from "lucide-react";

interface BuilderHeaderProps {
  workflowName: string;

  isDirty: boolean;

  saving: boolean;

  running: boolean;

  onSave: () => void;

  onRun: () => void;
}

export function BuilderHeader({
  workflowName,
  isDirty,
  saving,
  running,
  onSave,
  onRun,
}: BuilderHeaderProps) {
  const busy =
    saving ||
    running;

  return (
    <header className="builder-header">
      <div className="builder-header__left">
        <div className="builder-header__breadcrumb">
          Workflows
          {" / "}
          {workflowName}
        </div>

        <div className="builder-header__title">
          <h1>
            {workflowName}
          </h1>

          {isDirty ? (
            <span className="builder-unsaved">
              저장되지 않은 변경사항
            </span>
          ) : (
            <span className="builder-saved">
              <CheckCircle2
                size={10}
              />

              저장됨
            </span>
          )}
        </div>

        <div className="builder-header__tabs">
          <button
            type="button"
            className="builder-tab builder-tab--active"
            aria-current="page"
          >
            Builder
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
            busy ||
            !isDirty
          }
        >
          <Save
            size={14}
          />

          {saving
            ? "저장 중..."
            : "Save"}
        </button>

        <button
          type="button"
          className="primary-button"
          onClick={
            onRun
          }
          disabled={
            busy
          }
        >
          <Play
            size={14}
          />

          {running
            ? "Starting..."
            : "Run"}
        </button>
      </div>
    </header>
  );
}