import { mockWorkflows } from "../../../mocks/workflows";

interface AlternativeWorkflowsProps {
  currentWorkflowId: string;
}

export function AlternativeWorkflows({
  currentWorkflowId,
}: AlternativeWorkflowsProps) {
  const alternatives = mockWorkflows.filter(
    (workflow) => workflow.id !== currentWorkflowId,
  );

  return (
    <section className="alternative-workflows">
      <h2>다른 추천 워크플로우</h2>

      <div className="alternative-workflows__grid">
        {alternatives.map((workflow) => (
          <article
            key={workflow.id}
            className="alternative-workflow-card"
          >
            <h3>{workflow.name}</h3>

            <p>{workflow.description}</p>

            <span>
              {workflow.nodes.length} Steps
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}