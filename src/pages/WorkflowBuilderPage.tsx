import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  GitBranch,
  TriangleAlert,
} from "lucide-react";

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
    updateEdge,
    removeEdge,
    markSaved,
  } =
    useWorkflowBuilderStore();

  useEffect(
    () => {
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

      let cancelled =
        false;

      async function loadWorkflow() {
        try {
          setLoading(
            true,
          );

          setError(
            null,
          );

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

          if (
            cancelled
          ) {
            return;
          }

          setDescription(
            workflow.description,
          );

          setValidationAgents(
            agents.map(
              (
                agent,
              ) => ({
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
              : "Workflow를 불러오지 못했습니다.",
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

      void loadWorkflow();

      return () => {
        cancelled =
          true;
      };
    },
    [
      workflowId,
      initializeWorkflow,
    ],
  );

  const selectedNode =
    useMemo(
      () =>
        nodes.find(
          (
            node,
          ) =>
            node.id ===
            selectedNodeId,
        ),
      [
        nodes,
        selectedNodeId,
      ],
    );

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
      } catch (
        saveError
      ) {
        window.alert(
          saveError instanceof
            Error
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
        } catch (
          validationError
        ) {
          window.alert(
            validationError instanceof
              Error
              ? validationError.message
              : "저장된 Workflow를 검증하지 못했습니다.",
          );

          return;
        }
      } else {
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
      } catch (
        runError
      ) {
        window.alert(
          runError instanceof
            Error
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

  const handleEdgeDelete = (
    edgeId: string,
  ) => {
    removeEdge(
      edgeId,
    );
  };

  if (
    loading
  ) {
    return (
      <div className="workflow-builder-page">
        <div className="builder-loading">
          <GitBranch
            size={28}
          />

          <strong>
            Workflow를 불러오는 중입니다
          </strong>

          <span>
            Node, 연결 정보와 Agent 구성을
            준비하고 있습니다.
          </span>
        </div>
      </div>
    );
  }

  if (
    error
  ) {
    return (
      <div className="workflow-builder-page">
        <div className="builder-error">
          <AlertCircle
            size={28}
          />

          <strong>
            Workflow를 불러오지 못했습니다
          </strong>

          <span>
            {error}
          </span>

          <span>
            Backend 서버가
            {" "}
            http://localhost:4000
            {" "}
            에서 실행 중인지 확인하세요.
          </span>
        </div>
      </div>
    );
  }

  const validationIssues =
    validationResult.errors.length >
    0
      ? validationResult.errors
      : validationResult.warnings;

  const validationState =
    validationResult.errors.length >
    0
      ? "error"
      : validationResult
            .warnings.length >
          0
        ? "warning"
        : "valid";

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

      <div className="builder-validation">
        <div className="builder-validation__summary">
          <div>
            <strong>
              Workflow Validation
            </strong>
          </div>

          <div className="builder-validation__counts">
            {validationState ===
              "valid" && (
              <span className="builder-validation-badge builder-validation-badge--valid">
                <CheckCircle2
                  size={10}
                />

                Valid
              </span>
            )}

            {validationResult
              .warnings.length >
              0 && (
              <span className="builder-validation-badge builder-validation-badge--warning">
                <TriangleAlert
                  size={10}
                />

                {
                  validationResult
                    .warnings
                    .length
                }{" "}
                Warnings
              </span>
            )}

            {validationResult
              .errors.length >
              0 && (
              <span className="builder-validation-badge builder-validation-badge--error">
                <AlertCircle
                  size={10}
                />

                {
                  validationResult
                    .errors
                    .length
                }{" "}
                Errors
              </span>
            )}
          </div>
        </div>

        {validationState ===
        "valid" ? (
          <div className="builder-validation-item">
            Workflow 구조가 정상입니다.
            저장하거나 실행할 수 있습니다.
          </div>
        ) : (
          <div className="builder-validation__list">
            {validationIssues
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
                    className={[
                      "builder-validation-item",

                      validationState ===
                      "error"
                        ? "builder-validation-item--error"
                        : "builder-validation-item--warning",
                    ].join(
                      " ",
                    )}
                  >
                    {issue.message}
                  </div>
                ),
              )}

            {validationIssues.length >
              3 && (
              <div
                className={[
                  "builder-validation-item",

                  validationState ===
                  "error"
                    ? "builder-validation-item--error"
                    : "builder-validation-item--warning",
                ].join(
                  " ",
                )}
              >
                외{" "}
                {validationIssues.length -
                  3}
                개의{" "}
                {validationState ===
                "error"
                  ? "오류"
                  : "경고"}
                가 있습니다.
              </div>
            )}
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
          onEdgeDelete={
            handleEdgeDelete
          }
        />

        <StepSettingsPanel
          node={
            selectedNode
          }
          nodes={
            nodes
          }
          edges={
            edges
          }
          onNodeChange={
            updateNode
          }
          onEdgeChange={
            updateEdge
          }
          onDeleteNode={
            removeNode
          }
        />
      </div>
    </div>
  );
}