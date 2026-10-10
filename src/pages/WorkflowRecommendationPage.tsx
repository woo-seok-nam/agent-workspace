import {
  useEffect,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import type {
  Workflow,
} from "../features/workflow/types";

import {
  fetchWorkflows,
} from "../api/workflows";

import {
  RecommendedWorkflowCard,
} from "../features/recommendation/components/RecommendedWorkflowCard";

import {
  RecommendationStepList,
} from "../features/recommendation/components/RecommendationStepList";

import {
  AlternativeWorkflows,
} from "../features/recommendation/components/AlternativeWorkflows";

import "../features/recommendation/RecommendationPage.css";

interface RecommendationLocationState {
  prompt?: string;
}

export function WorkflowRecommendationPage() {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const state =
    location.state as
      | RecommendationLocationState
      | null;

  const prompt =
    state?.prompt ??
    "새로운 작업을 위한 Workflow를 추천합니다.";

  const [
    workflows,
    setWorkflows,
  ] =
    useState<
      Workflow[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  useEffect(() => {
    async function loadWorkflows() {
      try {
        setLoading(true);
        setError(null);

        const data =
          await fetchWorkflows();

        setWorkflows(
          data,
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "추천 Workflow를 불러오지 못했습니다.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadWorkflows();
  }, []);

  if (loading) {
    return (
      <div className="recommendation-page">
        추천 Workflow를 불러오는
        중입니다...
      </div>
    );
  }

  if (error) {
    return (
      <div className="recommendation-page">
        <h1>
          Workflow Recommendation
        </h1>

        <p>
          {error}
        </p>
      </div>
    );
  }

  const recommendedWorkflow =
    workflows[0];

  if (!recommendedWorkflow) {
    return (
      <div className="recommendation-page">
        추천 가능한 Workflow가
        없습니다.
      </div>
    );
  }

  const handleCustomize =
    () => {
      navigate(
        `/workflows/${recommendedWorkflow.id}/builder`,
      );
    };

  const handleRun =
    () => {
      navigate(
        "/runs/run-preview",
        {
          state: {
            workflowId:
              recommendedWorkflow.id,

            prompt,
          },
        },
      );
    };

  return (
    <div className="recommendation-page">
      <header className="recommendation-header">
        <span>
          Workflow Recommendation
        </span>

        <h1>
          추천 워크플로우
        </h1>

        <p>
          입력한 작업을 수행하기에
          적합한 Workflow를
          추천했습니다.
        </p>
      </header>

      <section className="recommendation-prompt">
        <span>
          입력한 작업
        </span>

        <p>
          {prompt}
        </p>
      </section>

      <RecommendedWorkflowCard
        workflow={
          recommendedWorkflow
        }
        onRun={
          handleRun
        }
        onCustomize={
          handleCustomize
        }
      />

      <RecommendationStepList
        workflow={
          recommendedWorkflow
        }
      />

      <AlternativeWorkflows
        workflows={
          workflows
        }
        currentWorkflowId={
          recommendedWorkflow.id
        }
      />
    </div>
  );
}