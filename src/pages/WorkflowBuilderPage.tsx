import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
} from "react-router-dom";

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

import "../features/workflow/WorkflowBuilder.css";

export function WorkflowBuilderPage() {
  const {
    workflowId,
  } = useParams();

  const [
    description,
    setDescription,
  ] = useState<
    string | undefined
  >(undefined);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    saving,
    setSaving,
  ] = useState(false);

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
    if (!workflowId) {
      setError(
        "Workflow ID가 없습니다.",
      );

      setLoading(false);

      return;
    }

    const currentWorkflowId =
      workflowId;

    async function loadWorkflow() {
      try {
        setLoading(true);
        setError(null);

        const workflow =
          await fetchWorkflow(
            currentWorkflowId,
          );

        setDescription(
          workflow.description,
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
        setLoading(false);
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

  const handleSave =
    async () => {
      if (!workflowId) {
        return;
      }

      const currentWorkflowId =
        workflowId;

      try {
        setSaving(true);

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
        setSaving(false);
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

  if (loading) {
    return (
      <div className="workflow-builder-page">
        Workflow를 불러오는 중입니다...
      </div>
    );
  }

  if (error) {
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
        onSave={() => {
          void handleSave();
        }}
      />

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