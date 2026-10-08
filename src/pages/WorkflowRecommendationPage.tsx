import { useLocation, useNavigate } from "react-router-dom";

import { mockWorkflows } from "../mocks/workflows";

import { RecommendedWorkflowCard } from "../features/recommendation/components/RecommendedWorkflowCard";
import { RecommendationStepList } from "../features/recommendation/components/RecommendationStepList";
import { AlternativeWorkflows } from "../features/recommendation/components/AlternativeWorkflows";

import "../features/recommendation/RecommendationPage.css";

interface RecommendationLocationState {
  prompt?: string;
}

export function WorkflowRecommendationPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const state =
    location.state as RecommendationLocationState | null;

  const prompt =
    state?.prompt ??
    "새로운 작업을 위한 워크플로우를 추천합니다.";

  const recommendedWorkflow = mockWorkflows[0];

  if (!recommendedWorkflow) {
    return <div>추천 가능한 워크플로우가 없습니다.</div>;
  }

  const handleCustomize = () => {
    navigate(
      `/workflows/${recommendedWorkflow.id}/builder`,
    );
  };

  const handleRun = () => {
    navigate("/runs/run-preview");
  };

  return (
    <div className="recommendation-page">
      <header className="recommendation-header">
        <span>Workflow Recommendation</span>

        <h1>추천 워크플로우</h1>

        <p>
          입력한 작업을 수행하기에 가장 적합한
          워크플로우를 추천했습니다.
        </p>
      </header>

      <section className="recommendation-prompt">
        <span>입력한 작업</span>

        <p>{prompt}</p>
      </section>

      <RecommendedWorkflowCard
        workflow={recommendedWorkflow}
        onRun={handleRun}
        onCustomize={handleCustomize}
      />

      <RecommendationStepList
        workflow={recommendedWorkflow}
      />

      <AlternativeWorkflows
        currentWorkflowId={recommendedWorkflow.id}
      />
    </div>
  );
}