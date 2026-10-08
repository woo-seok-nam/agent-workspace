import { useEffect } from "react";
import { useParams } from "react-router-dom";

import { mockWorkflows } from "../mocks/workflows";

import { BuilderHeader } from "../features/workflow/components/BuilderHeader";
import { NodeLibrary } from "../features/workflow/components/NodeLibrary";
import { WorkflowCanvas } from "../features/workflow/components/WorkflowCanvas";
import { StepSettingsPanel } from "../features/workflow/components/StepSettingsPanel";

import { useWorkflowBuilderStore } from "../features/workflow/store/workflowBuilderStore";

import "../features/workflow/WorkflowBuilder.css";

export function WorkflowBuilderPage() {
  const { workflowId } = useParams();

  const workflow = mockWorkflows.find(
    (item) => item.id === workflowId,
  );

  const {
    workflowId: builderWorkflowId,

    name,

    nodes,
    edges,

    selectedNodeId,

    isDirty,

    initializeWorkflow,
    selectNode,
    updateNode,
    updateNodePosition,
    addEdge,
  } = useWorkflowBuilderStore();

  useEffect(() => {
    if (!workflow) {
      return;
    }

    if (
      builderWorkflowId !== workflow.id
    ) {
      initializeWorkflow(workflow);
    }
  }, [
    workflow,
    builderWorkflowId,
    initializeWorkflow,
  ]);

  if (!workflow) {
    return (
      <div>
        Workflow를 찾을 수 없습니다.
      </div>
    );
  }

  const selectedNode = nodes.find(
    (node) =>
      node.id === selectedNodeId,
  );

  const handleEdgeCreate = (
    source: string,
    target: string,
  ) => {
    const alreadyExists =
      edges.some(
        (edge) =>
          edge.source === source &&
          edge.target === target,
      );

    if (alreadyExists) {
      return;
    }

    addEdge({
      id: `edge-${crypto.randomUUID()}`,
      source,
      target,
    });
  };

  return (
    <div className="workflow-builder-page">
      <BuilderHeader
        workflowName={
          name || workflow.name
        }
        isDirty={isDirty}
      />

      <div className="builder-layout">
        <NodeLibrary />

        <WorkflowCanvas
          nodes={nodes}
          edges={edges}
          selectedNodeId={
            selectedNodeId
          }
          onNodeSelect={selectNode}
          onNodePositionChange={
            updateNodePosition
          }
          onEdgeCreate={
            handleEdgeCreate
          }
        />

        <StepSettingsPanel
          node={selectedNode}
          onNodeChange={updateNode}
        />
      </div>
    </div>
  );
}