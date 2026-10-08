import { useState } from "react";
import { useParams } from "react-router-dom";

import { mockWorkflows } from "../mocks/workflows";

import { BuilderHeader } from "../features/workflow/components/BuilderHeader";
import { NodeLibrary } from "../features/workflow/components/NodeLibrary";
import { WorkflowCanvas } from "../features/workflow/components/WorkflowCanvas";
import { StepSettingsPanel } from "../features/workflow/components/StepSettingsPanel";

import "../features/workflow/WorkflowBuilder.css";

export function WorkflowBuilderPage() {
  const { workflowId } = useParams();

  const [selectedNodeId, setSelectedNodeId] =
    useState<string | null>(null);

  const workflow = mockWorkflows.find(
    (item) => item.id === workflowId,
  );

  if (!workflow) {
    return (
      <div>
        Workflow를 찾을 수 없습니다.
      </div>
    );
  }

  const selectedNode = workflow.nodes.find(
    (node) => node.id === selectedNodeId,
  );

  return (
    <div className="workflow-builder-page">
      <BuilderHeader
        workflowName={workflow.name}
      />

      <div className="builder-layout">
        <NodeLibrary />

        <WorkflowCanvas
          nodes={workflow.nodes}
          edges={workflow.edges}
          onNodeSelect={setSelectedNodeId}
        />

        <StepSettingsPanel
          node={selectedNode}
        />
      </div>
    </div>
  );
}