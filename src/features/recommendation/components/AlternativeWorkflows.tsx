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
      (workflow) =>
        workflow.id !==
        currentWorkflowId,
    );

  if (
    alternatives.length === 0
  ) {
    return null;
  }

  return (
    <section className="alternative-workflows">
      <div className="alternative-workflows__header">
        <h2>
          Alternative Workflows
        </h2>

        <p>
          다른 Workflow도 선택할 수
          있습니다.
        </p>
      </div>

      <div className="alternative-workflows__list">
        {alternatives.map(
          (workflow) => (
            <button
              key={
                workflow.id
              }
              type="button"
              className="alternative-workflow-card"
              onClick={() => {
                navigate(
                  `/workflows/${workflow.id}/builder`,
                );
              }}
            >
              <div className="alternative-workflow-card__icon">
                <GitBranch
                  size={15}
                />
              </div>

              <div className="alternative-workflow-card__content">
                <strong>
                  {workflow.name}
                </strong>

                <span>
                  {
                    workflow.nodes
                      .length
                  }
                  {" "}
                  Steps
                </span>
              </div>

              <ArrowRight
                size={14}
              />
            </button>
          ),
        )}
      </div>
    </section>
  );
}