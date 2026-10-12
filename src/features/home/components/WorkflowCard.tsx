import {
  ArrowRight,
  Bot,
  GitBranch,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

import type {
  Workflow,
} from "../../workflow/types";

interface WorkflowCardProps {
  workflow: Workflow;
}

export function WorkflowCard({
  workflow,
}: WorkflowCardProps) {
  const agentCount =
    new Set(
      workflow.nodes
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
    <Link
      to={`/workflows/${workflow.id}/builder`}
      className="workflow-card"
      aria-label={`${workflow.name} Workflow Builder 열기`}
    >
      <div className="workflow-card__icon">
        <GitBranch
          size={18}
        />
      </div>

      <div className="workflow-card__content">
        <h3>
          {workflow.name}
        </h3>

        <p>
          {workflow.description ??
            "Workflow 설명이 없습니다."}
        </p>

        <div className="workflow-card__meta">
          <span>
            <GitBranch
              size={10}
            />

            {workflow.nodes.length}
            {" "}
            Steps
          </span>

          <span>
            <Bot
              size={10}
            />

            {agentCount}
            {" "}
            Agents
          </span>
        </div>
      </div>

      <span
        className="workflow-card__action"
        aria-hidden="true"
      >
        <ArrowRight
          size={16}
        />
      </span>
    </Link>
  );
}