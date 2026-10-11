import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  fetchAgents,
} from "../api/agents";

import {
  createRun,
} from "../api/runs";

import {
  fetchWorkflow,
  updateWorkflow,
} from "../api/workflows";

import {
  BuilderHeader,
} from "../features/workflow/components/BuilderHeader";

import {
  NodeLibrary,
} from "../features/workflow/components/NodeLibrary";

import {
  WorkflowCanvas,
} from "../features/workflow/components/WorkflowCanvas";

import {
  StepSettingsPanel,
} from "../features/workflow/components/StepSettingsPanel";

import {
  useWorkflowBuilderStore,
} from "../features/workflow/store/workflowBuilderStore";

import {
  formatWorkflowValidationMessage,
  validateWorkflow,
} from "../features/workflow/validation/workflowValidator";

import "../features/workflow/WorkflowBuilder.css";

interface ValidationAgent {
  id: string;

  enabled: boolean;
}

export function WorkflowBuilderPage() {
  const {
    workflowId,
  } =
    useParams();

  const navigate =
    useNavigate();

  const [
    description,
    setDescription,
  ] =
    useState<
      string | undefined
    >(
      undefined,
    );

  const [
    validationAgents,
    setValidationAgents,
  ] =
    useState<
      ValidationAgent[]
    >([]);

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
    saving,
    setSaving,
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

  const {
    name,
    nodes,
    edges,
    selectedNodeId,
    isDirty,

    initializeWorkflow,
    selectNode,
    updateNode,
    updateNodePosition,
    addNode,
    removeNode,
    addEdge,
    markSaved,
  } =
    useWorkflowBuilderStore();

  useEffect(() => {
    if (
      !workflowId
    ) {
      setError(
        "Workflow ID가 없습니다.",
      );

      setLoading(
        false,
      );

      return;
    }

    const currentWorkflowId =
      workflowId;

    async function loadWorkflow() {
      try {
        setLoading(
          true,
        );

        setError(
          null,
        );

        /*
         * Workflow Validation을 위해
         * Workflow와 현재 Agent 목록을
         * 함께 불러온다.
         */
        const [
          workflow,
          agents,
        ] =
          await Promise.all([
            fetchWorkflow(
              currentWorkflowId,
            ),

            fetchAgents(),
          ]);

        setDescription(
          workflow.description,
        );

        setValidationAgents(
          agents.map(
            (agent) => ({
              id:
                agent.id,

              enabled:
                agent.enabled,
            }),
          ),
        );

        initializeWorkflow(
          workflow,
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Workflow를 불러오지 못했습니다.",
        );
      } finally {
        setLoading(
          false,
        );
      }
    }

    void loadWorkflow();
  }, [
    workflowId,
    initializeWorkflow,
  ]);

  const selectedNode =
    useMemo(
      () =>
        nodes.find(
          (node) =>
            node.id ===
            selectedNodeId,
        ),
      [
        nodes,
        selectedNodeId,
      ],
    );

  /*
   * 현재 Builder에 표시되고 있는
   * Workflow 구조를 실시간으로 검증한다.
   */
  const validationResult =
    useMemo(
      () =>
        validateWorkflow(
          nodes,
          edges,
          {
            agents:
              validationAgents,
          },
        ),
      [
        nodes,
        edges,
        validationAgents,
      ],
    );

  const handleSave =
    async () => {
      if (
        !workflowId
      ) {
        return;
      }

      /*
       * Validation ERROR가 있으면
       * 서버 저장 자체를 차단한다.
       */
      if (
        !validationResult.isValid
      ) {
        window.alert(
          [
            "Workflow를 저장할 수 없습니다.",
            "",
            formatWorkflowValidationMessage(
              validationResult,
            ),
          ].join(
            "\n",
          ),
        );

        return;
      }

      /*
       * WARNING만 존재한다면
       * 사용자에게 알려준 뒤 저장 여부를 묻는다.
       */
      if (
        validationResult
          .warnings.length >
        0
      ) {
        const confirmed =
          window.confirm(
            [
              "Workflow에 경고가 있습니다.",
              "",
              formatWorkflowValidationMessage(
                validationResult,
              ),
              "",
              "그래도 저장하시겠습니까?",
            ].join(
              "\n",
            ),
          );

        if (
          !confirmed
        ) {
          return;
        }
      }

      const currentWorkflowId =
        workflowId;

      try {
        setSaving(
          true,
        );

        await updateWorkflow(
          currentWorkflowId,
          {
            name,
            description,
            nodes,
            edges,
          },
        );

        markSaved();

        window.alert(
          "Workflow가 저장되었습니다.",
        );
      } catch (saveError) {
        window.alert(
          saveError instanceof Error
            ? saveError.message
            : "Workflow 저장에 실패했습니다.",
        );
      } finally {
        setSaving(
          false,
        );
      }
    };

  const handleRun =
    async () => {
      if (
        !workflowId ||
        running
      ) {
        return;
      }

      /*
       * 저장되지 않은 변경사항이 있으면
       * 실제 실행 대상은 현재 Builder Draft가 아니라
       * 서버에 저장된 Workflow이다.
       *
       * 따라서 기존 동작을 유지하면서
       * 서버 Workflow를 다시 가져와서
       * 그 구조를 검증한다.
       */
      if (
        isDirty
      ) {
        const confirmed =
          window.confirm(
            "저장되지 않은 변경사항이 있습니다. 현재 저장된 Workflow 기준으로 실행하시겠습니까?",
          );

        if (
          !confirmed
        ) {
          return;
        }

        try {
          const savedWorkflow =
            await fetchWorkflow(
              workflowId,
            );

          const savedValidation =
            validateWorkflow(
              savedWorkflow.nodes,
              savedWorkflow.edges,
              {
                agents:
                  validationAgents,
              },
            );

          if (
            !savedValidation.isValid
          ) {
            window.alert(
              [
                "현재 저장된 Workflow를 실행할 수 없습니다.",
                "",
                formatWorkflowValidationMessage(
                  savedValidation,
                ),
              ].join(
                "\n",
              ),
            );

            return;
          }

          if (
            savedValidation
              .warnings.length >
            0
          ) {
            const warningConfirmed =
              window.confirm(
                [
                  "현재 저장된 Workflow에 경고가 있습니다.",
                  "",
                  formatWorkflowValidationMessage(
                    savedValidation,
                  ),
                  "",
                  "그래도 실행하시겠습니까?",
                ].join(
                  "\n",
                ),
              );

            if (
              !warningConfirmed
            ) {
              return;
            }
          }
        } catch (validationError) {
          window.alert(
            validationError instanceof Error
              ? validationError.message
              : "저장된 Workflow를 검증하지 못했습니다.",
          );

          return;
        }
      } else {
        /*
         * Dirty 상태가 아니라면
         * 화면의 Workflow와 서버 Workflow가 동일하므로
         * 현재 Validation 결과를 그대로 사용한다.
         */
        if (
          !validationResult.isValid
        ) {
          window.alert(
            [
              "Workflow를 실행할 수 없습니다.",
              "",
              formatWorkflowValidationMessage(
                validationResult,
              ),
            ].join(
              "\n",
            ),
          );

          return;
        }

        if (
          validationResult
            .warnings.length >
          0
        ) {
          const confirmed =
            window.confirm(
              [
                "Workflow에 경고가 있습니다.",
                "",
                formatWorkflowValidationMessage(
                  validationResult,
                ),
                "",
                "그래도 실행하시겠습니까?",
              ].join(
                "\n",
              ),
            );

          if (
            !confirmed
          ) {
            return;
          }
        }
      }

      try {
        setRunning(
          true,
        );

        const run =
          await createRun({
            workflowId,

            name:
              `${name} Run`,
          });

        navigate(
          `/runs/${run.id}`,
        );
      } catch (runError) {
        window.alert(
          runError instanceof Error
            ? runError.message
            : "Workflow Run 생성에 실패했습니다.",
        );
      } finally {
        setRunning(
          false,
        );
      }
    };

  const handleEdgeCreate = (
    source: string,
    target: string,
  ) => {
    addEdge({
      id:
        `edge-${crypto.randomUUID()}`,

      source,

      target,
    });
  };

  if (
    loading
  ) {
    return (
      <div className="workflow-builder-page">
        Workflow를 불러오는 중입니다...
      </div>
    );
  }

  if (
    error
  ) {
    return (
      <div className="workflow-builder-page">
        <h1>
          Workflow Builder
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
    <div className="workflow-builder-page">
      <BuilderHeader
        workflowName={
          name
        }
        isDirty={
          isDirty
        }
        saving={
          saving
        }
        running={
          running
        }
        onSave={() => {
          void handleSave();
        }}
        onRun={() => {
          void handleRun();
        }}
      />

      <div
        style={{
          padding:
            "0 20px",
        }}
      >
        {validationResult
          .errors.length >
        0 ? (
          <div
            style={{
              marginBottom:
                "12px",

              padding:
                "10px 12px",

              border:
                "1px solid rgba(220, 38, 38, 0.25)",

              borderRadius:
                "8px",

              background:
                "rgba(220, 38, 38, 0.06)",

              fontSize:
                "12px",
            }}
          >
            <strong>
              Workflow Validation
              {" · "}
              {
                validationResult
                  .errors
                  .length
              }
              개 오류
            </strong>

            <div
              style={{
                marginTop:
                  "6px",
              }}
            >
              {validationResult
                .errors
                .slice(
                  0,
                  3,
                )
                .map(
                  (
                    issue,
                  ) => (
                    <div
                      key={`${issue.code}-${issue.nodeId ?? issue.edgeId ?? issue.message}`}
                    >
                      •{" "}
                      {
                        issue.message
                      }
                    </div>
                  ),
                )}

              {validationResult
                .errors
                .length >
                3 && (
                <div>
                  외{" "}
                  {validationResult
                    .errors
                    .length -
                    3}
                  개 오류가 있습니다.
                </div>
              )}
            </div>
          </div>
        ) : validationResult
            .warnings
            .length >
          0 ? (
          <div
            style={{
              marginBottom:
                "12px",

              padding:
                "10px 12px",

              border:
                "1px solid rgba(217, 119, 6, 0.25)",

              borderRadius:
                "8px",

              background:
                "rgba(217, 119, 6, 0.06)",

              fontSize:
                "12px",
            }}
          >
            <strong>
              Workflow Validation
              {" · "}
              {
                validationResult
                  .warnings
                  .length
              }
              개 경고
            </strong>

            <div
              style={{
                marginTop:
                  "6px",
              }}
            >
              {
                validationResult
                  .warnings[0]
                  ?.message
              }
            </div>
          </div>
        ) : (
          <div
            style={{
              marginBottom:
                "12px",

              padding:
                "8px 12px",

              border:
                "1px solid rgba(22, 163, 74, 0.2)",

              borderRadius:
                "8px",

              background:
                "rgba(22, 163, 74, 0.05)",

              fontSize:
                "12px",
            }}
          >
            Workflow 구조가 정상입니다.
          </div>
        )}
      </div>

      <div className="builder-layout">
        <NodeLibrary
          onAddNode={
            addNode
          }
        />

        <WorkflowCanvas
          nodes={
            nodes
          }
          edges={
            edges
          }
          selectedNodeId={
            selectedNodeId
          }
          onNodeSelect={
            selectNode
          }
          onNodePositionChange={
            updateNodePosition
          }
          onEdgeCreate={
            handleEdgeCreate
          }
        />

        <StepSettingsPanel
          node={
            selectedNode
          }
          onNodeChange={
            updateNode
          }
          onDeleteNode={
            removeNode
          }
        />
      </div>
    </div>
  );
}