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
  const visibleWorkflows =
    workflows.slice(
      0,
      4,
    );

  return (
    <section className="home-section">
      <div className="home-section__header">
        <div>
          <h2>
            Workflows
          </h2>

          <p>
            저장된 Workflow를 빠르게 열고
            작업을 이어갈 수 있습니다.
          </p>
        </div>
      </div>

      {visibleWorkflows.length >
      0 ? (
        <div className="workflow-grid">
          {visibleWorkflows.map(
            (
              workflow,
            ) => (
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
          <strong>
            아직 저장된 Workflow가 없습니다.
          </strong>

          <p>
            위 입력창에서 작업 목표를 입력하면
            추천 작업 흐름을 생성할 수 있습니다.
          </p>
        </div>
      )}
    </section>
  );
}