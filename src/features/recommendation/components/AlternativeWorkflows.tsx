import {
  ArrowRight,
  GitBranch,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import type {
  Workflow,
} from "../../workflow/types";

interface AlternativeWorkflowsProps {
  workflows: Workflow[];

  currentWorkflowId: string;
}

export function AlternativeWorkflows({
  workflows,
  currentWorkflowId,
}: AlternativeWorkflowsProps) {
  const navigate =
    useNavigate();

  const alternatives =
    workflows.filter(
      (
        workflow,
      ) =>
        workflow.id !==
        currentWorkflowId,
    );

  if (
    alternatives.length ===
    0
  ) {
    return null;
  }

  return (
    <section className="alternative-workflows alternative-workflows--saved">
      <div className="alternative-workflows__header">
        <div>
          <span className="alternative-workflows__eyebrow">
            Saved Workflows
          </span>

          <h2>
            Alternative Workflows
          </h2>
        </div>

        <p>
          기존에 저장된 다른 Workflow를
          Builder에서 확인할 수 있습니다.
        </p>
      </div>

      <div className="alternative-workflows__list">
        {alternatives.map(
          (
            workflow,
          ) => {
            const executionStepCount =
              workflow.nodes.filter(
                (
                  node,
                ) =>
                  node.type !==
                    "input" &&
                  node.type !==
                    "output",
              ).length;

            return (
              <button
                key={
                  workflow.id
                }
                type="button"
                className="alternative-workflow-card alternative-workflow-card--saved"
                onClick={() => {
                  navigate(
                    `/workflows/${workflow.id}/builder`,
                  );
                }}
                aria-label={`${workflow.name} Workflow를 Builder에서 열기`}
              >
                <div className="alternative-workflow-card__icon">
                  <GitBranch
                    size={16}
                  />
                </div>

                <div className="alternative-workflow-card__content">
                  <strong>
                    {workflow.name}
                  </strong>

                  <span>
                    {executionStepCount}{" "}
                    Execution{" "}
                    {executionStepCount ===
                    1
                      ? "Step"
                      : "Steps"}
                  </span>
                </div>

                <span
                  className="alternative-workflow-card__action"
                  aria-hidden="true"
                >
                  <ArrowRight
                    size={15}
                  />
                </span>
              </button>
            );
          },
        )}
      </div>
    </section>
  );
}