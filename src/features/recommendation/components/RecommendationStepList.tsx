import {
  Bot,
  CheckCircle2,
} from "lucide-react";

import type {
  Workflow,
} from "../../workflow/types";

import {
  getEnabledAgents,
  getEnabledModels,
} from "../../../data/catalogRepository";

interface RecommendationStepListProps {
  workflow: Workflow;
}

export function RecommendationStepList({
  workflow,
}: RecommendationStepListProps) {
  const agents =
    getEnabledAgents();

  const models =
    getEnabledModels();

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

  const getAgentName = (
    agentId?: string,
  ) => {
    if (
      !agentId
    ) {
      return "-";
    }

    return (
      agents.find(
        (
          agent,
        ) =>
          agent.id ===
          agentId,
      )?.name ??
      "Agent 정보 없음"
    );
  };

  const getModelName = (
    agentId?: string,
    nodeModelId?: string,
  ) => {
    /*
     * Preview Workflow에는 과거에 저장된 modelId가
     * 남아 있을 수 있다.
     *
     * 따라서 현재 Agent 설정의 modelId를 우선 사용하고,
     * Agent를 찾지 못했을 때만 Workflow Node의 modelId를
     * fallback으로 사용한다.
     */
    const currentAgent =
      agentId
        ? agents.find(
            (
              agent,
            ) =>
              agent.id ===
              agentId,
          )
        : undefined;

    const modelId =
      currentAgent?.modelId ??
      nodeModelId;

    if (
      !modelId
    ) {
      return "-";
    }

    return (
      models.find(
        (
          model,
        ) =>
          model.id ===
          modelId,
      )?.displayName ??
      formatModelId(
        modelId,
      )
    );
  };

  return (
    <section className="recommendation-steps">
      {executableNodes.map(
        (
          node,
          index,
        ) => (
          <article
            key={
              node.id
            }
            className="recommendation-step"
          >
            <div className="recommendation-step__number">
              {index +
                1}
            </div>

            <div className="recommendation-step__main">
              <div className="recommendation-step__title">
                <h3>
                  {node.name}
                </h3>

                {node.config
                  ?.requireApproval && (
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
                <Bot
                  size={13}
                />

                {getAgentName(
                  node.agentId,
                )}
              </span>

              <span>
                <CheckCircle2
                  size={13}
                />

                {getModelName(
                  node.agentId,
                  node.modelId,
                )}
              </span>
            </div>
          </article>
        ),
      )}
    </section>
  );
}

function formatModelId(
  modelId: string,
) {
  return modelId
    .split(
      /[-_]/,
    )
    .filter(
      Boolean,
    )
    .map(
      (
        part,
      ) => {
        const normalized =
          part.toLowerCase();

        if (
          normalized ===
          "gpt"
        ) {
          return "GPT";
        }

        if (
          normalized ===
          "ai"
        ) {
          return "AI";
        }

        return part
          .charAt(
            0,
          )
          .toUpperCase() +
          part.slice(
            1,
          );
      },
    )
    .join(
      " ",
    );
}