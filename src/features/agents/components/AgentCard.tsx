import {
  Bot,
  CheckCircle2,
  CircleOff,
  Wrench,
} from "lucide-react";

import type {
  Agent,
} from "../types";

import {
  mockModels,
} from "../../../mocks/models";

interface AgentCardProps {
  agent: Agent;

  selected?: boolean;

  onClick: () => void;
}

export function AgentCard({
  agent,
  selected = false,
  onClick,
}: AgentCardProps) {
  const model =
    mockModels.find(
      (item) =>
        item.id ===
        agent.modelId,
    );

  return (
    <button
      type="button"
      className={[
        "agent-card",
        selected
          ? "agent-card--selected"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
    >
      <div className="agent-card__icon">
        <Bot size={18} />
      </div>

      <div className="agent-card__content">
        <div className="agent-card__title">
          <strong>
            {agent.name}
          </strong>

          {agent.enabled ? (
            <span className="agent-card__status agent-card__status--enabled">
              <CheckCircle2
                size={11}
              />
              Active
            </span>
          ) : (
            <span className="agent-card__status agent-card__status--disabled">
              <CircleOff
                size={11}
              />
              Disabled
            </span>
          )}
        </div>

        <p>
          {agent.description ??
            "설명이 없습니다."}
        </p>

        <div className="agent-card__meta">
          <span>
            {model?.displayName ??
              "Model 없음"}
          </span>

          <span>
            <Wrench size={10} />
            {agent.toolIds.length} Tools
          </span>
        </div>
      </div>
    </button>
  );
}