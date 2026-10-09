import {
  RotateCcw,
  Share2,
} from "lucide-react";

interface ResultHeaderProps {
  title: string;

  workflowName: string;

  onRerun: () => void;
}

export function ResultHeader({
  title,
  workflowName,
  onRerun,
}: ResultHeaderProps) {
  return (
    <header className="result-header">
      <div>
        <div className="result-header__breadcrumb">
          Workspace / Results
        </div>

        <h1>{title}</h1>

        <p>
          Workflow: {workflowName}
        </p>
      </div>

      <div className="result-header__actions">
        <button
          type="button"
          className="secondary-button"
        >
          <Share2 size={14} />
          공유
        </button>

        <button
          type="button"
          className="primary-button"
          onClick={onRerun}
        >
          <RotateCcw size={14} />
          다시 실행
        </button>
      </div>
    </header>
  );
}