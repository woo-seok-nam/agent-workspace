import {
  useEffect,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  mockWorkflows,
} from "../mocks/workflows";

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
  validateWorkflow,
} from "../features/workflow/utils/workflowValidation";

import type {
  Workflow,
} from "../features/workflow/types";

import "../features/workflow/WorkflowBuilder.css";

export function WorkflowBuilderPage() {
  const {
    workflowId,
  } = useParams();

  const navigate =
    useNavigate();

  const workflow =
    mockWorkflows.find(
      (item) =>
        item.id ===
        workflowId,
    );

  const {
    workflowId:
      builderWorkflowId,

    name,

    nodes,
    edges,

    selectedNodeId,

    isDirty,

    initializeWorkflow,

    selectNode,

    addNode,

    updateNode,

    updateNodePosition,

    removeNode,

    addEdge,

    removeEdge,

    markSaved,
  } =
    useWorkflowBuilderStore();

  useEffect(() => {
    if (!workflow) {
      return;
    }

    if (
      builderWorkflowId ===
      workflow.id
    ) {
      return;
    }

    const storageKey =
      `agent-workspace-workflow-${workflow.id}`;

    const saved =
      localStorage.getItem(
        storageKey,
      );

    if (saved) {
      try {
        const parsed =
          JSON.parse(
            saved,
          ) as Workflow;

        initializeWorkflow(
          parsed,
        );

        return;
      } catch {
        localStorage.removeItem(
          storageKey,
        );
      }
    }

    initializeWorkflow(
      workflow,
    );
  }, [
    workflow,
    builderWorkflowId,
    initializeWorkflow,
  ]);

  if (!workflow) {
    return (
      <div>
        Workflow를 찾을
        수 없습니다.
      </div>
    );
  }

  const selectedNode =
    nodes.find(
      (node) =>
        node.id ===
        selectedNodeId,
    );

  const handleEdgeCreate = (
    source: string,
    target: string,
  ) => {
    const alreadyExists =
      edges.some(
        (edge) =>
          edge.source ===
            source &&
          edge.target ===
            target,
      );

    if (alreadyExists) {
      return;
    }

    addEdge({
      id:
        `edge-${crypto.randomUUID()}`,

      source,
      target,
    });
  };

  const handleSave = () => {
    const validation =
      validateWorkflow(
        nodes,
        edges,
      );

    if (!validation.valid) {
      window.alert(
        [
          "Workflow를 저장할 수 없습니다.",
          "",
          ...validation.errors,
        ].join("\n"),
      );

      return;
    }

    const savedWorkflow: Workflow = {
      id: workflow.id,

      name:
        name ||
        workflow.name,

      description:
        workflow.description,

      nodes,

      edges,

      createdAt:
        workflow.createdAt,

      updatedAt:
        new Date().toISOString(),
    };

    localStorage.setItem(
      `agent-workspace-workflow-${workflow.id}`,

      JSON.stringify(
        savedWorkflow,
      ),
    );

    markSaved();

    window.alert(
      "Workflow가 저장되었습니다.",
    );
  };

  const handleRun = () => {
    const validation =
      validateWorkflow(
        nodes,
        edges,
      );

    if (!validation.valid) {
      window.alert(
        [
          "Workflow를 실행할 수 없습니다.",
          "",
          ...validation.errors,
        ].join("\n"),
      );

      return;
    }

    navigate(
      "/runs/run-preview",
    );
  };

  return (
    <div className="workflow-builder-page">
      <BuilderHeader
        workflowName={
          name ||
          workflow.name
        }
        isDirty={
          isDirty
        }
        onSave={
          handleSave
        }
        onRun={
          handleRun
        }
      />

      <div className="builder-layout">
        <NodeLibrary
          onAddNode={
            addNode
          }
        />

        <WorkflowCanvas
          nodes={nodes}
          edges={edges}
          selectedNodeId={
            selectedNodeId
          }
          onNodeSelect={(
            nodeId,
          ) => {
            selectNode(
              nodeId ||
                null,
            );
          }}
          onNodePositionChange={
            updateNodePosition
          }
          onEdgeCreate={
            handleEdgeCreate
          }
          onEdgeDelete={
            removeEdge
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