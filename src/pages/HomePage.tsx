import {
  useEffect,
  useState,
} from "react";

import type {
  Workflow,
} from "../features/workflow/types";

import {
  fetchWorkflows,
} from "../api/workflows";

import {
  GoalInput,
} from "../features/home/components/GoalInput";

import {
  RecommendedWorkflows,
} from "../features/home/components/RecommendedWorkflows";

import {
  RecentRuns,
} from "../features/home/components/RecentRuns";

import "../features/home/HomePage.css";

export function HomePage() {
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
            : "Workflow 목록을 불러오지 못했습니다.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadWorkflows();
  }, []);

  return (
    <div className="home-page">
      <header className="home-header">
        <div>
          <span>
            Agent Workspace
          </span>

          <h1>
            무엇을 실행할까요?
          </h1>

          <p>
            작업 목표를 입력하면
            적절한 Workflow를 추천하고
            실행할 수 있습니다.
          </p>
        </div>
      </header>

      <GoalInput />

      {loading ? (
        <section className="home-section">
          Workflow를 불러오는
          중입니다...
        </section>
      ) : error ? (
        <section className="home-section">
          <p>
            {error}
          </p>

          <p>
            Backend 서버가
            http://localhost:4000 에서
            실행 중인지 확인하세요.
          </p>
        </section>
      ) : (
        <RecommendedWorkflows
          workflows={
            workflows
          }
        />
      )}

      <RecentRuns />
    </div>
  );
}