import type {
  Workflow,
  WorkflowNode,
} from "../modules/workflows/workflow.types.js";

import type {
  StepRun,
} from "../modules/runs/run.types.js";

function isExecutableNode(
  node: WorkflowNode,
) {
  return (
    node.type !== "input" &&
    node.type !== "output"
  );
}

export function getExecutableNodes(
  workflow: Workflow,
): WorkflowNode[] {
  return workflow.nodes.filter(
    isExecutableNode,
  );
}

export function getExecutableDependencies(
  workflow: Workflow,
  nodeId: string,
): string[] {
  const executableNodeIds =
    new Set(
      getExecutableNodes(
        workflow,
      ).map(
        (node) =>
          node.id,
      ),
    );

  return workflow.edges
    .filter(
      (edge) =>
        edge.target ===
        nodeId,
    )
    .map(
      (edge) =>
        edge.source,
    )
    .filter(
      (sourceNodeId) =>
        executableNodeIds.has(
          sourceNodeId,
        ),
    );
}

export function canExecuteNode(
  workflow: Workflow,
  nodeId: string,
  stepRuns: StepRun[],
): boolean {
  const dependencies =
    getExecutableDependencies(
      workflow,
      nodeId,
    );

  if (
    dependencies.length === 0
  ) {
    return true;
  }

  return dependencies.every(
    (dependencyNodeId) => {
      const dependencyStep =
        stepRuns.find(
          (stepRun) =>
            stepRun.nodeId ===
            dependencyNodeId,
        );

      return (
        dependencyStep?.status ===
        "COMPLETED"
      );
    },
  );
}

export function getDependencyOutputs(
  workflow: Workflow,
  nodeId: string,
  stepRuns: StepRun[],
): Record<string, unknown> {
  const dependencies =
    getExecutableDependencies(
      workflow,
      nodeId,
    );

  const outputs: Record<
    string,
    unknown
  > = {};

  for (
    const dependencyNodeId
    of dependencies
  ) {
    const stepRun =
      stepRuns.find(
        (step) =>
          step.nodeId ===
          dependencyNodeId,
      );

    outputs[
      dependencyNodeId
    ] =
      stepRun?.output;
  }

  return outputs;
}