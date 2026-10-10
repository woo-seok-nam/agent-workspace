import {
  useEffect,
  useState,
} from "react";

import type {
  Workflow,
} from "../features/workflow/types";

import type {
  WorkflowRun,
} from "../features/runs/types";

import {
  fetchWorkflows,
} from "../api/workflows";

import {
  fetchRuns,
} from "../api/runs";

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
    runs,
    setRuns,
  ] =
    useState<
      WorkflowRun[]
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
    async function loadHomeData() {
      try {
        setLoading(true);
        setError(null);

        const [
          workflowData,
          runData,
        ] =
          await Promise.all([
            fetchWorkflows(),
            fetchRuns(),
          ]);

        setWorkflows(
          workflowData,
        );

        setRuns(
          runData,
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Home 데이터를 불러오지 못했습니다.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadHomeData();
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
          데이터를 불러오는 중입니다...
        </section>
      ) : error ? (
        <section className="home-section">
          <p>
            {error}
          </p>

          <p>
            Backend 서버가
            http://localhost:4000
            에서 실행 중인지 확인하세요.
          </p>
        </section>
      ) : (
        <>
          <RecommendedWorkflows
            workflows={
              workflows
            }
          />

          <RecentRuns
            runs={
              runs
            }
          />
        </>
      )}
    </div>
  );
}