import { Clock3, Users } from "lucide-react";

import type { Workflow } from "../../workflow/types";

interface RecommendedWorkflowCardProps {
  workflow: Workflow;
  onRun: () => void;
  onCustomize: () => void;
}

export function RecommendedWorkflowCard({
  workflow,
  onRun,
  onCustomize,
}: RecommendedWorkflowCardProps) {
  const agentCount = new Set(
    workflow.nodes
      .map((node) => node.agentId)
      .filter((agentId): agentId is string => Boolean(agentId)),
  ).size;

  return (
    <section className="recommended-workflow-card">
      <div className="recommended-workflow-card__content">
        <span className="recommended-workflow-card__label">
          추천 워크플로우
        </span>

        <h2>{workflow.name}</h2>

        <p>{workflow.description}</p>

        <div className="recommended-workflow-card__meta">
          <span>
            {workflow.nodes.length} Steps
          </span>

          <span>
            <Users size={13} />
            {agentCount} Agents
          </span>

          <span>
            <Clock3 size={13} />
            약 8분
          </span>
        </div>
      </div>

      <div className="recommended-workflow-card__actions">
        <button
          type="button"
          className="secondary-button"
          onClick={onCustomize}
        >
          커스텀 설정
        </button>

        <button
          type="button"
          className="primary-button"
          onClick={onRun}
        >
          바로 실행
        </button>
      </div>
    </section>
  );
}