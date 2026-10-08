import { MoreHorizontal, Play, Save } from "lucide-react";

interface BuilderHeaderProps {
  workflowName: string;
}

export function BuilderHeader({
  workflowName,
}: BuilderHeaderProps) {
  return (
    <header className="builder-header">
      <div>
        <div className="builder-header__breadcrumb">
          Workflows / {workflowName}
        </div>

        <h1>{workflowName}</h1>

        <div className="builder-header__tabs">
          <button
            type="button"
            className="builder-tab builder-tab--active"
          >
            Builder
          </button>

          <button type="button" className="builder-tab">
            Settings
          </button>

          <button type="button" className="builder-tab">
            Versions
          </button>
        </div>
      </div>

      <div className="builder-header__actions">
        <button type="button" className="secondary-button">
          <Save size={15} />
          저장
        </button>

        <button
          type="button"
          className="builder-icon-button"
          aria-label="더보기"
        >
          <MoreHorizontal size={18} />
        </button>

        <button type="button" className="primary-button">
          <Play size={15} />
          실행
        </button>
      </div>
    </header>
  );
}