import { Bot, CheckCircle2 } from "lucide-react";

import type { Workflow } from "../../workflow/types";
import { mockAgents } from "../../../mocks/agents";
import { mockModels } from "../../../mocks/models";

interface RecommendationStepListProps {
  workflow: Workflow;
}

export function RecommendationStepList({
  workflow,
}: RecommendationStepListProps) {
  const executableNodes = workflow.nodes.filter(
    (node) =>
      node.type !== "input" &&
      node.type !== "output",
  );

  const getAgentName = (agentId?: string) => {
    if (!agentId) {
      return "-";
    }

    return (
      mockAgents.find((agent) => agent.id === agentId)?.name ??
      "Unknown Agent"
    );
  };

  const getModelName = (modelId?: string) => {
    if (!modelId) {
      return "-";
    }

    return (
      mockModels.find((model) => model.id === modelId)?.displayName ??
      "Unknown Model"
    );
  };

  return (
    <section className="recommendation-steps">
      {executableNodes.map((node, index) => (
        <article
          key={node.id}
          className="recommendation-step"
        >
          <div className="recommendation-step__number">
            {index + 1}
          </div>

          <div className="recommendation-step__main">
            <div className="recommendation-step__title">
              <h3>{node.name}</h3>

              {node.config?.requireApproval && (
                <span className="approval-label">
                  승인 필요
                </span>
              )}
            </div>

            <p>
              {node.description ??
                `${node.name} 단계를 수행합니다.`}
            </p>
          </div>

          <div className="recommendation-step__meta">
            <span>
              <Bot size={13} />
              {getAgentName(node.agentId)}
            </span>

            <span>
              <CheckCircle2 size={13} />
              {getModelName(node.modelId)}
            </span>
          </div>
        </article>
      ))}
    </section>
  );
}