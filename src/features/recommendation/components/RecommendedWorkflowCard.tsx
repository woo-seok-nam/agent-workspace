import {
  GitBranch,
  Users,
} from "lucide-react";

import type {
  Workflow,
} from "../../workflow/types";

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
  const executableNodes =
    workflow.nodes.filter(
      (
        node,
      ) =>
        node.type !==
          "input" &&
        node.type !==
          "output",
    );

  const agentCount =
    new Set(
      executableNodes
        .map(
          (
            node,
          ) =>
            node.agentId,
        )
        .filter(
          (
            agentId,
          ): agentId is string =>
            Boolean(
              agentId,
            ),
        ),
    ).size;

  return (
    <section className="recommended-workflow-card">
      <div className="recommended-workflow-card__content">
        <span className="recommended-workflow-card__label">
          추천 워크플로우
        </span>

        <h2>
          {workflow.name}
        </h2>

        <p>
          {workflow.description ??
            "Workflow 설명이 없습니다."}
        </p>

        <div className="recommended-workflow-card__meta">
          <span>
            <GitBranch
              size={13}
            />

            {executableNodes.length}
            {" "}
            Execution Steps
          </span>

          <span>
            <Users
              size={13}
            />

            {agentCount}
            {" "}
            Agents
          </span>
        </div>
      </div>

      <div className="recommended-workflow-card__actions">
        <button
          type="button"
          className="secondary-button"
          onClick={
            onCustomize
          }
        >
          커스텀 설정
        </button>

        <button
          type="button"
          className="primary-button"
          onClick={
            onRun
          }
        >
          바로 실행
        </button>
      </div>
    </section>
  );
}