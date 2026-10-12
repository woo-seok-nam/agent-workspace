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
  if (
    !playbookName
  ) {
    return 0;
  }

  const workflowText =
    [
      workflow.name,
      workflow.description ??
        "",
      ...workflow.nodes.map(
        (
          node,
        ) =>
          `${node.name} ${node.description ?? ""}`,
      ),
    ]
      .join(
        " ",
      )
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
        (
          token,
        ) =>
          token.trim(),
      )
      .filter(
        (
          token,
        ) =>
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

  if (
    !playbook
  ) {
    return workflows[0];
  }

  const ranked =
    workflows
      .map(
        (
          workflow,
        ) => ({
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

/*
 * STEP 51에서 Artifact를 재사용할 경우
 * 실제 prompt 안에는 <artifact_context> 전체 내용이 포함된다.
 *
 * 추천 화면에서는 수천 자의 Artifact 원문을 그대로 보여주지 않고
 * 실제 사용자 요청 부분만 표시한다.
 *
 * Backend로 전달되는 prompt 자체는 수정하지 않는다.
 */
function getPromptDisplayText(
  prompt: string,
) {
  const artifactContextIndex =
    prompt.indexOf(
      "<artifact_context>",
    );

  if (
    artifactContextIndex ===
    -1
  ) {
    return prompt;
  }

  const visiblePrompt =
    prompt
      .slice(
        0,
        artifactContextIndex,
      )
      .trim();

  return [
    visiblePrompt,
    "",
    "이전 Workspace의 Artifact가 참고 자료로 연결되어 있습니다.",
  ].join(
    "\n",
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

  const displayPrompt =
    useMemo(
      () =>
        getPromptDisplayText(
          prompt,
        ),
      [
        prompt,
      ],
    );

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
    >(
      null,
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
            (
              workflow,
            ) =>
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
        <header className="recommendation-header">
          <span>
            Guidance
          </span>

          <h1>
            작업 목표를 분석하고 있습니다
          </h1>

          <p>
            입력한 목표에 적합한 작업 방식과
            Workflow 구조를 찾고 있습니다.
          </p>
        </header>

        <div className="recommendation-status-message">
          적합한 Workflow를 분석하는 중입니다...
        </div>
      </div>
    );
  }

  if (
    error
  ) {
    return (
      <div className="recommendation-page">
        <header className="recommendation-header">
          <span>
            Guidance
          </span>

          <h1>
            Workflow 추천을 완료하지 못했습니다
          </h1>

          <p>
            작업 목표를 분석하는 과정에서
            문제가 발생했습니다.
          </p>
        </header>

        <section className="recommendation-empty">
          <p>
            {error}
          </p>

          <button
            type="button"
            className="primary-button"
            onClick={() => {
              navigate(
                "/new-task",
              );
            }}
          >
            작업 다시 입력하기
          </button>
        </section>
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
        <header className="recommendation-header">
          <span>
            Guidance
          </span>

          <h1>
            추천 작업 흐름을 찾지 못했습니다
          </h1>

          <p>
            현재 입력으로 적절한 작업 방식을
            결정하기 어렵습니다.
          </p>
        </header>

        <section className="recommendation-empty">
          <p>
            작업 목표를 조금 더 구체적으로
            입력한 뒤 다시 시도해주세요.
          </p>

          <button
            type="button"
            className="primary-button"
            onClick={() => {
              navigate(
                "/new-task",
              );
            }}
          >
            작업 다시 입력하기
          </button>
        </section>
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

            /*
             * 내부 도메인에서는 Playbook이라는
             * 명칭을 계속 사용한다.
             *
             * 사용자 화면에만 "가이던스"로 표시한다.
             */
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
          작업 목표를 분석하고 검증된 작업 패턴을
          기준으로 적합한 Workflow와 실행 순서를
          구성했습니다.
        </p>
      </header>

      <section className="recommendation-prompt">
        <span>
          입력한 작업
        </span>

        <p>
          {displayPrompt}
        </p>
      </section>

      <section className="guidance-summary-card">
        <div className="guidance-summary-card__header">
          <div>
            <span className="guidance-summary-card__eyebrow">
              추천 가이던스
            </span>

            <h2>
              {selectedPlaybook.name}
            </h2>

            <p>
              {selectedPlaybook.description}
            </p>
          </div>
        </div>

        <div className="guidance-summary-metrics">
          <div className="guidance-summary-metric">
            <span>
              적합도
            </span>

            <strong>
              {recommendation?.confidence ??
                0}
              %
            </strong>
          </div>

          <div className="guidance-summary-metric">
            <span>
              작업 유형
            </span>

            <strong>
              {selectedPlaybook.category}
            </strong>
          </div>

          <div className="guidance-summary-metric">
            <span>
              작업 단계
            </span>

            <strong>
              {selectedPlaybook.steps.length}
              개
            </strong>
          </div>
        </div>

        {recommendation &&
          recommendation.reasons.length >
            0 && (
            <div className="guidance-reasons">
              <strong>
                이 작업 흐름을 추천한 이유
              </strong>

              <ul>
                {recommendation.reasons.map(
                  (
                    reason,
                  ) => (
                    <li
                      key={
                        reason
                      }
                    >
                      {reason}
                    </li>
                  ),
                )}
              </ul>
            </div>
          )}

        <div className="guidance-flow">
          <strong>
            추천 작업 흐름
          </strong>

          <div className="guidance-flow__steps">
            {selectedPlaybook.steps.map(
              (
                step,
                index,
              ) => (
                <div
                  key={
                    step.id
                  }
                  className="guidance-flow__step"
                >
                  <span className="guidance-flow__step-name">
                    {step.name}
                  </span>

                  {index <
                    selectedPlaybook.steps.length -
                      1 && (
                    <span className="guidance-flow__arrow">
                      →
                    </span>
                  )}
                </div>
              ),
            )}
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

          <p className="recommendation-preview-notice">
            위 Workflow는 추천 구조를 미리 보여주는
            Preview입니다. 실행하거나 수정하면 현재
            가이던스를 기준으로 새로운 Workflow가
            생성됩니다.
          </p>
        </>
      )}

      {!previewWorkflow && (
        <section className="recommendation-empty">
          <p>
            기존 Workflow 중 미리 보여줄 구조는
            없지만, 현재 추천 가이던스를 기준으로
            새로운 Workflow를 생성할 수 있습니다.
          </p>

          <div className="recommended-workflow-card__actions">
            <button
              type="button"
              className="secondary-button"
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
                : "Builder에서 수정"}
            </button>

            <button
              type="button"
              className="primary-button"
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
                : "바로 실행"}
            </button>
          </div>
        </section>
      )}

      {creatingWorkflow && (
        <p className="recommendation-status-message">
          추천 가이던스를 기준으로 Agent와 Tool을
          배정하고 Workflow를 생성하고 있습니다...
        </p>
      )}

      {running && (
        <p className="recommendation-status-message">
          추천 Workflow를 생성하고 실행 환경을
          준비하고 있습니다...
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
          <section className="alternative-workflows">
            <h2>
              다른 가이던스 후보
            </h2>

            <div className="alternative-workflows__grid">
              {recommendation.alternatives.map(
                (
                  alternative,
                ) => (
                  <article
                    key={
                      alternative.playbook.id
                    }
                    className="alternative-workflow-card"
                  >
                    <h3>
                      {alternative.playbook.name}
                    </h3>

                    <p>
                      {alternative.playbook.description}
                    </p>

                    <span>
                      적합도{" "}
                      {alternative.score}
                      %
                    </span>

                    {alternative.matchedKeywords.length >
                      0 && (
                      <p>
                        관련 키워드:{" "}
                        {alternative.matchedKeywords.join(
                          ", ",
                        )}
                      </p>
                    )}
                  </article>
                ),
              )}
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