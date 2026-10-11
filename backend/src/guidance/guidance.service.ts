import {
  getEnabledPlaybooks,
  recommendPlaybook,
} from "./playbook.service.js";

import type {
  RecommendWorkflowInput,
  RecommendWorkflowResult,
} from "./guidance.types.js";

export function recommendWorkflowFromGoal(
  input: RecommendWorkflowInput,
): RecommendWorkflowResult {
  const goal =
    input.goal?.trim();

  if (!goal) {
    throw new Error(
      "작업 목표를 입력해주세요.",
    );
  }

  const recommendation =
    recommendPlaybook(
      goal,
    );

  const availablePlaybooks =
    getEnabledPlaybooks().map(
      (playbook) => ({
        id:
          playbook.id,

        name:
          playbook.name,

        description:
          playbook.description,

        category:
          playbook.category,

        stepCount:
          playbook.steps.length,
      }),
    );

  return {
    recommendation,

    selectedPlaybook:
      recommendation.recommendedPlaybook,

    availablePlaybooks,
  };
}