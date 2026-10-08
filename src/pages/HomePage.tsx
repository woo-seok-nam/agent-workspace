import { mockWorkflows } from "../mocks/workflows";
import { mockRuns } from "../mocks/runs";

export function HomePage() {
  return (
    <section>
      <h1>무엇을 작업하고 싶으신가요?</h1>

      <p>
        AI Agent가 최적의 작업 방법을 찾아 도와드립니다.
      </p>

      <h2>추천 워크플로우</h2>

      {mockWorkflows.map((workflow) => (
        <div key={workflow.id}>
          {workflow.name}
        </div>
      ))}

      <h2>최근 실행</h2>

      {mockRuns.map((run) => (
        <div key={run.id}>
          {run.name} - {run.status}
        </div>
      ))}
    </section>
  );
}