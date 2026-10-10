import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Filter,
  Search,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import {
  fetchRuns,
} from "../api/runs";

import type {
  WorkflowRun,
  WorkflowRunStatus,
} from "../features/runs/types";

import {
  RunHistoryTable,
} from "../features/runs/components/RunHistoryTable";

import "../features/runs/RunHistory.css";

type StatusFilter =
  | "ALL"
  | WorkflowRunStatus;

export function RunsHistoryPage() {
  const navigate =
    useNavigate();

  const [
    runs,
    setRuns,
  ] =
    useState<
      WorkflowRun[]
    >([]);

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>(
      "ALL",
    );

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
    async function loadRuns() {
      try {
        setLoading(true);
        setError(null);

        const data =
          await fetchRuns();

        setRuns(
          data,
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Run 목록을 불러오지 못했습니다.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadRuns();
  }, []);

  const filteredRuns =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      return runs.filter(
        (run) => {
          const matchesSearch =
            !keyword ||
            run.name
              .toLowerCase()
              .includes(
                keyword,
              ) ||
            run.id
              .toLowerCase()
              .includes(
                keyword,
              );

          const matchesStatus =
            statusFilter ===
              "ALL" ||
            run.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        },
      );
    }, [
      runs,
      search,
      statusFilter,
    ]);

  const completedCount =
    runs.filter(
      (run) =>
        run.status ===
        "COMPLETED",
    ).length;

  const runningCount =
    runs.filter(
      (run) =>
        run.status ===
        "RUNNING",
    ).length;

  const failedCount =
    runs.filter(
      (run) =>
        run.status ===
        "FAILED",
    ).length;

  const totalTokens =
    runs.reduce(
      (
        sum,
        run,
      ) =>
        sum +
        run.tokenUsage,
      0,
    );

  const totalCost =
    runs.reduce(
      (
        sum,
        run,
      ) =>
        sum +
        run.cost,
      0,
    );

  if (loading) {
    return (
      <div className="runs-history-page">
        실행 기록을 불러오는 중입니다...
      </div>
    );
  }

  if (error) {
    return (
      <div className="runs-history-page">
        <h1>
          Execution History
        </h1>

        <p>
          {error}
        </p>

        <p>
          Backend 서버가
          http://localhost:4000
          에서 실행 중인지 확인하세요.
        </p>
      </div>
    );
  }

  return (
    <div className="runs-history-page">
      <header className="runs-history-header">
        <div>
          <span>
            Agent Workspace
          </span>

          <h1>
            Execution History
          </h1>

          <p>
            Workflow 실행 기록과
            상태, Token 사용량,
            비용을 확인합니다.
          </p>
        </div>
      </header>

      <section className="run-summary-grid">
        <SummaryCard
          label="Total Runs"
          value={
            runs.length.toString()
          }
        />

        <SummaryCard
          label="Completed"
          value={
            completedCount.toString()
          }
        />

        <SummaryCard
          label="Running"
          value={
            runningCount.toString()
          }
        />

        <SummaryCard
          label="Failed"
          value={
            failedCount.toString()
          }
        />

        <SummaryCard
          label="Total Tokens"
          value={
            totalTokens.toLocaleString()
          }
        />

        <SummaryCard
          label="Total Cost"
          value={`$${totalCost.toFixed(
            2,
          )}`}
        />
      </section>

      <section className="run-history-panel">
        <div className="run-history-toolbar">
          <div className="run-history-search">
            <Search
              size={14}
            />

            <input
              type="text"
              placeholder="Run 검색"
              value={
                search
              }
              onChange={(
                event,
              ) => {
                setSearch(
                  event.target
                    .value,
                );
              }}
            />
          </div>

          <div className="run-history-filter">
            <Filter
              size={14}
            />

            <select
              value={
                statusFilter
              }
              onChange={(
                event,
              ) => {
                setStatusFilter(
                  event.target
                    .value as StatusFilter,
                );
              }}
            >
              <option value="ALL">
                전체 상태
              </option>

              <option value="QUEUED">
                실행 대기
              </option>

              <option value="RUNNING">
                실행 중
              </option>

              <option value="WAITING_APPROVAL">
                승인 대기
              </option>

              <option value="PAUSED">
                일시정지
              </option>

              <option value="COMPLETED">
                완료
              </option>

              <option value="FAILED">
                실패
              </option>

              <option value="CANCELLED">
                취소됨
              </option>
            </select>
          </div>
        </div>

        <RunHistoryTable
          runs={
            filteredRuns
          }
          onOpenRun={(
            runId,
          ) => {
            navigate(
              `/runs/${runId}`,
            );
          }}
          onOpenResult={(
            runId,
          ) => {
            navigate(
              `/workspace/${runId}`,
            );
          }}
        />
      </section>
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: string;
}

function SummaryCard({
  label,
  value,
}: SummaryCardProps) {
  return (
    <article className="run-summary-card">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </article>
  );
}