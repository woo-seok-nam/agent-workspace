import type {
  ResultTab,
} from "./ResultTabs";

interface ResultViewerProps {
  activeTab: ResultTab;
}

export function ResultViewer({
  activeTab,
}: ResultViewerProps) {
  if (
    activeTab ===
    "intermediate"
  ) {
    return (
      <section className="result-viewer">
        <div className="result-viewer__empty">
          <h2>
            Intermediate Outputs
          </h2>

          <p>
            각 Step에서 생성된
            중간 결과물이 여기에
            표시됩니다.
          </p>
        </div>
      </section>
    );
  }

  if (
    activeTab === "agents"
  ) {
    return (
      <section className="result-viewer">
        <div className="result-viewer__empty">
          <h2>
            Agent Outputs
          </h2>

          <p>
            Planner, Research,
            Writer, Reviewer 등의
            Agent별 결과물이 여기에
            표시됩니다.
          </p>
        </div>
      </section>
    );
  }

  if (
    activeTab === "logs"
  ) {
    return (
      <section className="result-viewer">
        <div className="result-log-preview">
          <div>
            <time>
              12:00:01
            </time>

            <span>
              Workflow 실행을
              시작했습니다.
            </span>
          </div>

          <div>
            <time>
              12:00:14
            </time>

            <span>
              Planner 단계가
              완료되었습니다.
            </span>
          </div>

          <div>
            <time>
              12:02:28
            </time>

            <span>
              Research 단계가
              완료되었습니다.
            </span>
          </div>

          <div>
            <time>
              12:04:10
            </time>

            <span>
              최종 결과 생성이
              완료되었습니다.
            </span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="result-viewer">
      <article className="result-document">
        <div className="result-document__header">
          <span>
            Final Result
          </span>

          <strong>
            Research Report
          </strong>
        </div>

        <div className="result-document__content">
          <h2>
            AI Agent Orchestration
            조사 보고서
          </h2>

          <p>
            AI Agent
            Orchestration은 여러
            Agent가 하나의 목표를
            달성하기 위해 역할을
            나누고 실행 순서를
            조정하는 구조입니다.
          </p>

          <h3>
            주요 구성 요소
          </h3>

          <ul>
            <li>
              Planner: 작업을
              분석하고 실행 계획을
              생성합니다.
            </li>

            <li>
              Research Agent:
              웹이나 문서에서 필요한
              정보를 수집합니다.
            </li>

            <li>
              Analysis Agent:
              수집된 데이터를 분석합니다.
            </li>

            <li>
              Writer Agent:
              분석 결과를 문서로
              작성합니다.
            </li>

            <li>
              Reviewer Agent:
              최종 결과를 검토합니다.
            </li>
          </ul>

          <h3>
            실행 구조
          </h3>

          <p>
            현재 Workflow는 Planner
            이후 Web Research와
            Document Research가
            병렬로 실행되고, 두
            작업이 모두 완료되면
            Analysis 단계로
            진행되는 DAG 구조를
            사용합니다.
          </p>
        </div>
      </article>
    </section>
  );
}