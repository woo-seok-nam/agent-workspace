import { mockWorkflows } from "../../../mocks/workflows";
import { WorkflowCard } from "./WorkflowCard";

export function RecommendedWorkflows() {
  return (
    <section className="home-section">
      <div className="home-section__header">
        <h2>추천 워크플로우</h2>
      </div>

      <div className="workflow-grid">
        {mockWorkflows.map((workflow) => (
          <WorkflowCard
            key={workflow.id}
            workflow={workflow}
          />
        ))}
      </div>
    </section>
  );
}