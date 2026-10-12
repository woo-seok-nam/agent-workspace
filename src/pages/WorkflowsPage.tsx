import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  ArrowRight,
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
    useState<
      Workflow[]
    >([]);

  const [
    search,
    setSearch,
  ] =
    useState(
      "",
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null,
    );

  useEffect(
    () => {
      let cancelled =
        false;

      async function loadWorkflows() {
        try {
          setLoading(
            true,
          );

          setError(
            null,
          );

          const data =
            await fetchWorkflows();

          if (
            cancelled
          ) {
            return;
          }

          setWorkflows(
            data,
          );
        } catch (
          loadError
        ) {
          if (
            cancelled
          ) {
            return;
          }

          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Workflow 목록을 불러오지 못했습니다.",
          );
        } finally {
          if (
            !cancelled
          ) {
            setLoading(
              false,
            );
          }
        }
      }

      void loadWorkflows();

      return () => {
        cancelled =
          true;
      };
    },
    [],
  );

  const filteredWorkflows =
    useMemo(
      () => {
        const keyword =
          search
            .trim()
            .toLowerCase();

        if (
          !keyword
        ) {
          return workflows;
        }

        return workflows.filter(
          (
            workflow,
          ) =>
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
      },
      [
        workflows,
        search,
      ],
    );

  if (
    loading
  ) {
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
              저장된 Workflow를 불러오고 있습니다.
            </p>
          </div>
        </header>

        <div className="workflow-list-loading">
          <div className="workflow-list-empty-icon">
            <GitBranch
              size={24}
            />
          </div>

          <h2>
            Workflow를 불러오는 중입니다
          </h2>

          <p>
            저장된 Workflow와 구성 정보를 확인하고 있습니다.
          </p>
        </div>
      </div>
    );
  }

  if (
    error
  ) {
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
              Workflow 정보를 불러오지 못했습니다.
            </p>
          </div>
        </header>

        <div className="workflow-list-error">
          <AlertCircle
            size={26}
          />

          <h2>
            Workflow 연결 오류
          </h2>

          <p>
            {error}
          </p>

          <p>
            Backend 서버가
            {" "}
            http://localhost:4000
            {" "}
            에서 정상적으로 실행 중인지 확인하세요.
          </p>
        </div>
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
            저장된 Workflow의 구조를 확인하고
            Builder에서 Agent, Model, Tool과 실행 흐름을
            수정할 수 있습니다.
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
          <Plus
            size={14}
          />

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
          {search.trim()
            ? `${filteredWorkflows.length} / ${workflows.length} workflows`
            : `${workflows.length} workflows`}
        </span>
      </div>

      {filteredWorkflows.length >
      0 ? (
        <div className="workflow-list-grid">
          {filteredWorkflows.map(
            (
              workflow,
            ) => {
              const agentCount =
                new Set(
                  workflow.nodes
                    .map(
                      (
                        node,
                      ) =>
                        node.agentId,
                    )
                    .filter(
                      (
                        agentId,
                      ): agentId is string =>
                        Boolean(
                          agentId,
                        ),
                    ),
                ).size;

              return (
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
                      <h2
                        title={
                          workflow.name
                        }
                      >
                        {workflow.name}
                      </h2>

                      <p>
                        {workflow.description ??
                          "Workflow 설명이 없습니다."}
                      </p>
                    </div>
                  </div>

                  <div className="workflow-list-card__stats">
                    <div>
                      <span>
                        Nodes
                      </span>

                      <strong>
                        {workflow.nodes.length}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Connections
                      </span>

                      <strong>
                        {workflow.edges.length}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Agents
                      </span>

                      <strong>
                        {agentCount}
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

                    <div className="workflow-list-card__footer-actions">
                      <button
                        type="button"
                        className="workflow-list-edit-button"
                        onClick={() => {
                          navigate(
                            `/workflows/${workflow.id}/builder`,
                          );
                        }}
                      >
                        Builder 열기

                        <ArrowRight
                          size={12}
                        />
                      </button>
                    </div>
                  </div>
                </article>
              );
            },
          )}
        </div>
      ) : (
        <div className="workflow-list-empty">
          <div className="workflow-list-empty-icon">
            <GitBranch
              size={25}
            />
          </div>

          <h2>
            {search.trim()
              ? "검색 결과가 없습니다."
              : "Workflow가 없습니다."}
          </h2>

          <p>
            {search.trim()
              ? `"${search}"와 일치하는 Workflow를 찾지 못했습니다.`
              : "새 작업에서 목표를 입력하면 추천 가이던스를 통해 Workflow를 생성할 수 있습니다."}
          </p>
        </div>
      )}
    </div>
  );
}

function formatDate(
  value: string,
) {
  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "-";
  }

  return date.toLocaleDateString(
    "ko-KR",
    {
      year:
        "numeric",

      month:
        "2-digit",

      day:
        "2-digit",
    },
  );
}