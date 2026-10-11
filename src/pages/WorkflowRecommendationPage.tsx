import {
  useEffect,
  useMemo,
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
  createGuidedWorkflow,
  recommendWorkflow,
} from "../api/guidance";

import type {
  RecommendWorkflowResult,
} from "../api/guidance";

import {
  createRun,
  startRun,
} from "../api/runs";

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

function calculateWorkflowMatchScore(
  workflow: Workflow,
  playbookName?: string,
  playbookDescription?: string,
) {
  if (!playbookName) {
    return 0;
  }

  const workflowText =
    [
      workflow.name,
      workflow.description ?? "",
      ...workflow.nodes.map(
        (node) =>
          `${node.name} ${node.description ?? ""}`,
      ),
    ]
      .join(" ")
      .toLowerCase();

  const playbookText =
    `${playbookName} ${playbookDescription ?? ""}`
      .toLowerCase();

  const playbookTokens =
    playbookText
      .split(
        /[\s&→,/()-]+/,
      )
      .map(
        (token) =>
          token.trim(),
      )
      .filter(
        (token) =>
          token.length >=
          2,
      );

  let score =
    0;

  for (
    const token
    of playbookTokens
  ) {
    if (
      workflowText.includes(
        token,
      )
    ) {
      score +=
        1;
    }
  }

  const normalizedWorkflowName =
    workflow.name
      .trim()
      .toLowerCase();

  const normalizedPlaybookName =
    playbookName
      .trim()
      .toLowerCase();

  if (
    normalizedWorkflowName ===
    normalizedPlaybookName
  ) {
    score +=
      100;
  } else if (
    normalizedWorkflowName.includes(
      normalizedPlaybookName,
    ) ||
    normalizedPlaybookName.includes(
      normalizedWorkflowName,
    )
  ) {
    score +=
      30;
  }

  return score;
}

function findBestWorkflowForGuidance(
  workflows: Workflow[],
  guidance:
    RecommendWorkflowResult | null,
) {
  if (
    workflows.length ===
    0
  ) {
    return undefined;
  }

  const playbook =
    guidance?.selectedPlaybook;

  if (!playbook) {
    return workflows[0];
  }

  const ranked =
    workflows
      .map(
        (workflow) => ({
          workflow,

          score:
            calculateWorkflowMatchScore(
              workflow,
              playbook.name,
              playbook.description,
            ),
        }),
      )
      .sort(
        (
          left,
          right,
        ) =>
          right.score -
          left.score,
      );

  const best =
    ranked[0];

  if (
    !best ||
    best.score <=
      0
  ) {
    return workflows[0];
  }

  return best.workflow;
}

function showGuidanceWarnings(
  warnings: string[],
) {
  if (
    warnings.length ===
    0
  ) {
    return;
  }

  window.alert(
    [
      "Workflow는 생성되었지만 확인이 필요한 항목이 있습니다.",
      "",
      ...warnings.map(
        (
          warning,
          index,
        ) =>
          `${index + 1}. ${warning}`,
      ),
    ].join(
      "\n",
    ),
  );
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
    guidance,
    setGuidance,
  ] =
    useState<
      RecommendWorkflowResult | null
    >(null);

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

  const [
    creatingWorkflow,
    setCreatingWorkflow,
  ] =
    useState(
      false,
    );

  const [
    running,
    setRunning,
  ] =
    useState(
      false,
    );

  useEffect(
    () => {
      let cancelled =
        false;

      async function loadRecommendation() {
        try {
          setLoading(
            true,
          );

          setError(
            null,
          );

          const [
            workflowData,
            guidanceData,
          ] =
            await Promise.all([
              fetchWorkflows(),

              recommendWorkflow(
                prompt,
              ),
            ]);

          if (
            cancelled
          ) {
            return;
          }

          setWorkflows(
            workflowData,
          );

          setGuidance(
            guidanceData,
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
              : "Workflow 추천을 불러오지 못했습니다.",
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

      void loadRecommendation();

      return () => {
        cancelled =
          true;
      };
    },
    [
      prompt,
    ],
  );

  /*
   * 아직 실제 Workflow를 생성하기 전이므로
   * 화면 Preview 용도로 기존 Workflow 중
   * 가장 가까운 구조를 표시한다.
   *
   * 실제 Customize / Run 시에는
   * 반드시 createGuidedWorkflow()를 통해
   * 새로운 Workflow를 생성한다.
   */
  const previewWorkflow =
    useMemo(
      () =>
        findBestWorkflowForGuidance(
          workflows,
          guidance,
        ),
      [
        workflows,
        guidance,
      ],
    );

  const orderedWorkflows =
    useMemo(
      () => {
        if (
          !previewWorkflow
        ) {
          return workflows;
        }

        return [
          previewWorkflow,

          ...workflows.filter(
            (workflow) =>
              workflow.id !==
              previewWorkflow.id,
          ),
        ];
      },
      [
        workflows,
        previewWorkflow,
      ],
    );

  if (
    loading
  ) {
    return (
      <div className="recommendation-page">
        작업 목표를 분석하고
        적합한 Workflow를 찾고 있습니다...
      </div>
    );
  }

  if (
    error
  ) {
    return (
      <div className="recommendation-page">
        <h1>
          Workflow Recommendation
        </h1>

        <p>
          {error}
        </p>

        <button
          type="button"
          onClick={() => {
            navigate(
              "/new-task",
            );
          }}
        >
          다시 입력하기
        </button>
      </div>
    );
  }

  const recommendation =
    guidance?.recommendation;

  const selectedPlaybook =
    guidance?.selectedPlaybook;

  if (
    !selectedPlaybook
  ) {
    return (
      <div className="recommendation-page">
        <h1>
          Workflow Recommendation
        </h1>

        <p>
          현재 작업에 사용할 추천 가이던스를
          결정하지 못했습니다.
        </p>

        <button
          type="button"
          onClick={() => {
            navigate(
              "/new-task",
            );
          }}
        >
          다시 입력하기
        </button>
      </div>
    );
  }

  /*
   * Customize
   *
   * 추천 가이던스를 기준으로
   * 새로운 Workflow를 실제 DB에 생성한 다음
   * 바로 Builder로 이동한다.
   */
  const handleCustomize =
    async () => {
      if (
        creatingWorkflow ||
        running
      ) {
        return;
      }

      try {
        setCreatingWorkflow(
          true,
        );

        const result =
          await createGuidedWorkflow({
            goal:
              prompt,

            playbookId:
              selectedPlaybook.id,
          });

        showGuidanceWarnings(
          result.warnings,
        );

        navigate(
          `/workflows/${result.workflow.id}/builder`,
        );
      } catch (
        createError
      ) {
        window.alert(
          createError instanceof Error
            ? createError.message
            : "추천 Workflow 생성에 실패했습니다.",
        );
      } finally {
        setCreatingWorkflow(
          false,
        );
      }
    };

  /*
   * Run
   *
   * 1. Guidance → 실제 Workflow 생성
   * 2. WorkflowRun 생성
   * 3. Workflow 실행 시작
   * 4. Runtime 화면 이동
   */
  const handleRun =
    async () => {
      if (
        running ||
        creatingWorkflow
      ) {
        return;
      }

      try {
        setRunning(
          true,
        );

        const guidedWorkflow =
          await createGuidedWorkflow({
            goal:
              prompt,

            playbookId:
              selectedPlaybook.id,
          });

        showGuidanceWarnings(
          guidedWorkflow.warnings,
        );

        const run =
          await createRun({
            workflowId:
              guidedWorkflow.workflow.id,

            name:
              prompt.length >
              40
                ? `${prompt.slice(
                    0,
                    40,
                  )}...`
                : prompt,

            prompt,
          });

        /*
         * 기존 Runtime UX와 동일하게
         * 실행 요청은 비동기로 시작하고
         * 바로 Runtime 페이지로 이동한다.
         */
        void startRun(
          run.id,
        );

        navigate(
          `/runs/${run.id}`,
        );
      } catch (
        runError
      ) {
        window.alert(
          runError instanceof Error
            ? runError.message
            : "Workflow 실행 시작에 실패했습니다.",
        );
      } finally {
        setRunning(
          false,
        );
      }
    };

  return (
    <div className="recommendation-page">
      <header className="recommendation-header">
        <span>
          Guidance
        </span>

        <h1>
          추천 워크플로우
        </h1>

        <p>
          작업 목표를 분석하고
          Reference Playbook을 기준으로
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

      <section
        style={{
          display:
            "grid",

          gap:
            "16px",

          padding:
            "20px",

          marginBottom:
            "20px",

          border:
            "1px solid rgba(148, 163, 184, 0.2)",

          borderRadius:
            "12px",
        }}
      >
        <div>
          <span>
            Recommended Playbook
          </span>

          <h2>
            {
              selectedPlaybook.name
            }
          </h2>

          <p>
            {
              selectedPlaybook.description
            }
          </p>
        </div>

        <div
          style={{
            display:
              "flex",

            gap:
              "12px",

            flexWrap:
              "wrap",
          }}
        >
          <div>
            <strong>
              적합도
            </strong>

            <p>
              {
                recommendation?.confidence ??
                0
              }
              %
            </p>
          </div>

          <div>
            <strong>
              Category
            </strong>

            <p>
              {
                selectedPlaybook.category
              }
            </p>
          </div>

          <div>
            <strong>
              Steps
            </strong>

            <p>
              {
                selectedPlaybook.steps.length
              }
            </p>
          </div>
        </div>

        {recommendation &&
          recommendation.reasons.length >
            0 && (
            <div>
              <strong>
                이 Workflow를 추천한 이유
              </strong>

              <ul>
                {
                  recommendation.reasons.map(
                    (
                      reason,
                    ) => (
                      <li
                        key={
                          reason
                        }
                      >
                        {
                          reason
                        }
                      </li>
                    ),
                  )
                }
              </ul>
            </div>
          )}

        <div>
          <strong>
            Playbook 구조
          </strong>

          <div
            style={{
              display:
                "flex",

              alignItems:
                "center",

              gap:
                "8px",

              flexWrap:
                "wrap",

              marginTop:
                "8px",
            }}
          >
            {
              selectedPlaybook.steps.map(
                (
                  step,
                  index,
                ) => (
                  <div
                    key={
                      step.id
                    }
                    style={{
                      display:
                        "flex",

                      alignItems:
                        "center",

                      gap:
                        "8px",
                    }}
                  >
                    <span>
                      {
                        step.name
                      }
                    </span>

                    {
                      index <
                        selectedPlaybook.steps.length -
                          1 && (
                        <span>
                          →
                        </span>
                      )
                    }
                  </div>
                ),
              )
            }
          </div>
        </div>
      </section>

      {previewWorkflow && (
        <>
          <RecommendedWorkflowCard
            workflow={
              previewWorkflow
            }
            onRun={() => {
              void handleRun();
            }}
            onCustomize={() => {
              void handleCustomize();
            }}
          />

          <p
            style={{
              marginTop:
                "8px",
            }}
          >
            위 Workflow는 구조 Preview입니다.
            실행 또는 수정 시 추천 가이던스를 기반으로
            새로운 Workflow가 생성됩니다.
          </p>
        </>
      )}

      {!previewWorkflow && (
        <section
          style={{
            display:
              "grid",

            gap:
              "12px",

            marginTop:
              "20px",
          }}
        >
          <p>
            기존 Workflow Preview는 없지만
            추천 가이던스를 이용해 새 Workflow를
            생성할 수 있습니다.
          </p>

          <div
            style={{
              display:
                "flex",

              gap:
                "8px",
            }}
          >
            <button
              type="button"
              disabled={
                creatingWorkflow ||
                running
              }
              onClick={() => {
                void handleCustomize();
              }}
            >
              {creatingWorkflow
                ? "Workflow 생성 중..."
                : "Customize"}
            </button>

            <button
              type="button"
              disabled={
                creatingWorkflow ||
                running
              }
              onClick={() => {
                void handleRun();
              }}
            >
              {running
                ? "실행 준비 중..."
                : "Run"}
            </button>
          </div>
        </section>
      )}

      {creatingWorkflow && (
        <p>
          추천 가이던스를 기반으로
          Agent와 Tool을 배정하고 있습니다...
        </p>
      )}

      {running && (
        <p>
          추천 Workflow를 생성하고
          실행을 준비하고 있습니다...
        </p>
      )}

      {previewWorkflow && (
        <RecommendationStepList
          workflow={
            previewWorkflow
          }
        />
      )}

      {recommendation &&
        recommendation.alternatives.length >
          0 && (
          <section
            style={{
              marginTop:
                "24px",

              marginBottom:
                "24px",
            }}
          >
            <h2>
              다른 Playbook 후보
            </h2>

            <div
              style={{
                display:
                  "grid",

                gap:
                  "12px",
              }}
            >
              {
                recommendation.alternatives.map(
                  (
                    alternative,
                  ) => (
                    <article
                      key={
                        alternative.playbook.id
                      }
                      style={{
                        padding:
                          "16px",

                        border:
                          "1px solid rgba(148, 163, 184, 0.2)",

                        borderRadius:
                          "10px",
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",

                          alignItems:
                            "center",

                          justifyContent:
                            "space-between",

                          gap:
                            "12px",
                        }}
                      >
                        <strong>
                          {
                            alternative.playbook.name
                          }
                        </strong>

                        <span>
                          {
                            alternative.score
                          }
                          %
                        </span>
                      </div>

                      <p>
                        {
                          alternative.playbook.description
                        }
                      </p>

                      {
                        alternative.matchedKeywords.length >
                          0 && (
                          <p>
                            Matching:{" "}
                            {
                              alternative.matchedKeywords.join(
                                ", ",
                              )
                            }
                          </p>
                        )
                      }
                    </article>
                  ),
                )
              }
            </div>
          </section>
        )}

      {workflows.length >
        0 && (
        <AlternativeWorkflows
          workflows={
            orderedWorkflows
          }
          currentWorkflowId={
            previewWorkflow?.id ??
            ""
          }
        />
      )}
    </div>
  );
}