import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  GitBranch,
  Plus,
  Search,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import type {
  Workflow,
} from "../features/workflow/types";

import {
  fetchWorkflows,
} from "../api/workflows";

import "../features/workflow/WorkflowList.css";

export function WorkflowsPage() {
  const navigate =
    useNavigate();

  const [
    workflows,
    setWorkflows,
  ] =
    useState<Workflow[]>([]);

  const [
    search,
    setSearch,
  ] =
    useState("");

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

  const filteredWorkflows =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      if (!keyword) {
        return workflows;
      }

      return workflows.filter(
        (workflow) =>
          workflow.name
            .toLowerCase()
            .includes(
              keyword,
            ) ||
          (
            workflow.description ??
            ""
          )
            .toLowerCase()
            .includes(
              keyword,
            ),
      );
    }, [
      workflows,
      search,
    ]);

  if (loading) {
    return (
      <div className="workflow-list-page">
        Workflow 목록을 불러오는 중입니다...
      </div>
    );
  }

  if (error) {
    return (
      <div className="workflow-list-page">
        <h1>
          Workflows
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
    <div className="workflow-list-page">
      <header className="workflow-list-header">
        <div>
          <span>
            Agent Workspace
          </span>

          <h1>
            Workflows
          </h1>

          <p>
            저장된 Workflow를 확인하고
            Builder에서 수정할 수 있습니다.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() => {
            navigate(
              "/new-task",
            );
          }}
        >
          <Plus size={15} />
          New Workflow
        </button>
      </header>

      <div className="workflow-list-toolbar">
        <div className="workflow-list-search">
          <Search
            size={14}
          />

          <input
            type="text"
            placeholder="Workflow 검색"
            value={
              search
            }
            onChange={(
              event,
            ) => {
              setSearch(
                event.target.value,
              );
            }}
          />
        </div>

        <span className="workflow-list-count">
          {
            filteredWorkflows.length
          }{" "}
          workflows
        </span>
      </div>

      {filteredWorkflows.length >
      0 ? (
        <div className="workflow-list-grid">
          {filteredWorkflows.map(
            (workflow) => (
              <article
                key={
                  workflow.id
                }
                className="workflow-list-card"
              >
                <div className="workflow-list-card__top">
                  <div className="workflow-list-card__icon">
                    <GitBranch
                      size={18}
                    />
                  </div>

                  <div>
                    <h2>
                      {
                        workflow.name
                      }
                    </h2>

                    <p>
                      {workflow.description ??
                        "설명이 없습니다."}
                    </p>
                  </div>
                </div>

                <div className="workflow-list-card__stats">
                  <div>
                    <span>
                      Nodes
                    </span>

                    <strong>
                      {
                        workflow
                          .nodes
                          .length
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Connections
                    </span>

                    <strong>
                      {
                        workflow
                          .edges
                          .length
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Agents
                    </span>

                    <strong>
                      {
                        new Set(
                          workflow.nodes
                            .map(
                              (
                                node,
                              ) =>
                                node.agentId,
                            )
                            .filter(
                              Boolean,
                            ),
                        ).size
                      }
                    </strong>
                  </div>
                </div>

                <div className="workflow-list-card__footer">
                  <span>
                    Updated{" "}
                    {formatDate(
                      workflow.updatedAt,
                    )}
                  </span>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      navigate(
                        `/workflows/${workflow.id}/builder`,
                      );
                    }}
                  >
                    Builder 열기
                  </button>
                </div>
              </article>
            ),
          )}
        </div>
      ) : (
        <div className="workflow-list-empty">
          <GitBranch
            size={26}
          />

          <h2>
            Workflow가 없습니다.
          </h2>

          <p>
            새로운 Workflow를 생성하거나
            검색 조건을 변경해보세요.
          </p>
        </div>
      )}
    </div>
  );
}

function formatDate(
  value: string,
) {
  return new Date(
    value,
  ).toLocaleDateString(
    "ko-KR",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  );
}