import {
  ArrowRight,
  Bot,
  GitBranch,
} from "lucide-react";

import {
  useNavigate,
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
  const navigate =
    useNavigate();

  const agentCount =
    new Set(
      workflow.nodes
        .map(
          (node) =>
            node.agentId,
        )
        .filter(
          (
            agentId,
          ): agentId is string =>
            Boolean(agentId),
        ),
    ).size;

  return (
    <article className="workflow-card">
      <div className="workflow-card__icon">
        <GitBranch
          size={19}
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
              size={11}
            />
            {workflow.nodes.length}
            {" "}
            Steps
          </span>

          <span>
            <Bot
              size={11}
            />
            {agentCount}
            {" "}
            Agents
          </span>
        </div>
      </div>

      <button
        type="button"
        className="workflow-card__action"
        aria-label={`${workflow.name} Builder 열기`}
        onClick={() => {
          navigate(
            `/workflows/${workflow.id}/builder`,
          );
        }}
      >
        <ArrowRight
          size={15}
        />
      </button>
    </article>
  );
}