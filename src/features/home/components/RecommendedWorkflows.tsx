import type {
  Workflow,
} from "../../workflow/types";

import {
  WorkflowCard,
} from "./WorkflowCard";

interface RecommendedWorkflowsProps {
  workflows: Workflow[];
}

export function RecommendedWorkflows({
  workflows,
}: RecommendedWorkflowsProps) {
  const recommendedWorkflows =
    workflows.slice(
      0,
      3,
    );

  return (
    <section className="home-section">
      <div className="home-section__header">
        <div>
          <h2>
            Recommended Workflows
          </h2>

          <p>
            자주 사용하는 작업을
            빠르게 시작할 수 있습니다.
          </p>
        </div>
      </div>

      {recommendedWorkflows.length >
      0 ? (
        <div className="workflow-grid">
          {recommendedWorkflows.map(
            (workflow) => (
              <WorkflowCard
                key={
                  workflow.id
                }
                workflow={
                  workflow
                }
              />
            ),
          )}
        </div>
      ) : (
        <div className="home-empty-state">
          사용 가능한 Workflow가
          없습니다.
        </div>
      )}
    </section>
  );
}