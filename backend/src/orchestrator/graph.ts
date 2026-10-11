import type {
  Workflow,
  WorkflowEdge,
  WorkflowNode,
} from "../modules/workflows/workflow.types.js";

import type {
  StepRun,
} from "../modules/runs/run.types.js";

type EdgeRuntimeState =
  | "ACTIVE"
  | "INACTIVE"
  | "UNRESOLVED";

function isExecutableNode(
  node: WorkflowNode,
) {
  return (
    node.type !==
      "input" &&
    node.type !==
      "output"
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

/*
 * 현재 Run 상태에서 실제로 활성화된
 * Dependency만 반환한다.
 *
 * Condition에서 선택되지 않은 Edge와
 * SKIPPED된 Branch는 제외한다.
 */
export function getActiveExecutableDependencies(
  workflow: Workflow,
  nodeId: string,
  stepRuns: StepRun[],
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
    .filter(
      (edge) =>
        executableNodeIds.has(
          edge.source,
        ),
    )
    .filter(
      (edge) =>
        getEdgeRuntimeState(
          workflow,
          edge,
          stepRuns,
        ) ===
        "ACTIVE",
    )
    .map(
      (edge) =>
        edge.source,
    );
}

export function canExecuteNode(
  workflow: Workflow,
  nodeId: string,
  stepRuns: StepRun[],
): boolean {
  const incomingEdges =
    workflow.edges.filter(
      (edge) =>
        edge.target ===
        nodeId,
    );

  /*
   * 들어오는 Edge가 아예 없다면
   * 기존 동작과 동일하게 실행 가능으로 둔다.
   *
   * 구조적 문제는 Workflow Validator가
   * 별도로 차단한다.
   */
  if (
    incomingEdges.length ===
    0
  ) {
    return true;
  }

  const edgeStates =
    incomingEdges.map(
      (edge) =>
        getEdgeRuntimeState(
          workflow,
          edge,
          stepRuns,
        ),
    );

  /*
   * 아직 upstream 실행 결과가 결정되지 않은
   * Edge가 하나라도 있으면 기다린다.
   */
  if (
    edgeStates.some(
      (state) =>
        state ===
        "UNRESOLVED",
    )
  ) {
    return false;
  }

  /*
   * 모든 incoming branch가 비활성화된 경우에는
   * 실행하지 않고 shouldSkipNode()가 SKIPPED 처리한다.
   */
  const hasActiveEdge =
    edgeStates.some(
      (state) =>
        state ===
        "ACTIVE",
    );

  if (
    !hasActiveEdge
  ) {
    return false;
  }

  /*
   * ACTIVE Edge의 executable source는
   * 모두 COMPLETED여야 한다.
   *
   * Input Node는 StepRun이 없으므로
   * 아래 Dependency 목록에는 포함되지 않는다.
   */
  const dependencies =
    getActiveExecutableDependencies(
      workflow,
      nodeId,
      stepRuns,
    );

  return dependencies.every(
    (
      dependencyNodeId,
    ) => {
      const dependencyStep =
        stepRuns.find(
          (stepRun) =>
            stepRun.nodeId ===
            dependencyNodeId,
        );

      return (
        dependencyStep
          ?.status ===
        "COMPLETED"
      );
    },
  );
}

/*
 * Condition 때문에 해당 Node로 들어오는
 * 모든 경로가 비활성화된 경우 true.
 *
 * Orchestrator는 해당 Step을 SKIPPED 처리한다.
 */
export function shouldSkipNode(
  workflow: Workflow,
  nodeId: string,
  stepRuns: StepRun[],
): boolean {
  const incomingEdges =
    workflow.edges.filter(
      (edge) =>
        edge.target ===
        nodeId,
    );

  if (
    incomingEdges.length ===
    0
  ) {
    return false;
  }

  const edgeStates =
    incomingEdges.map(
      (edge) =>
        getEdgeRuntimeState(
          workflow,
          edge,
          stepRuns,
        ),
    );

  /*
   * 아직 결과가 결정되지 않은 upstream이 있으면
   * SKIP 여부도 아직 결정하지 않는다.
   */
  if (
    edgeStates.some(
      (state) =>
        state ===
        "UNRESOLVED",
    )
  ) {
    return false;
  }

  /*
   * 모든 Edge가 INACTIVE이면
   * 이 Node에는 실제 실행 경로가 없다.
   */
  return edgeStates.every(
    (state) =>
      state ===
      "INACTIVE",
  );
}

export function getDependencyOutputs(
  workflow: Workflow,
  nodeId: string,
  stepRuns: StepRun[],
): Record<string, unknown> {
  const dependencies =
    getActiveExecutableDependencies(
      workflow,
      nodeId,
      stepRuns,
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

function getEdgeRuntimeState(
  workflow: Workflow,
  edge: WorkflowEdge,
  stepRuns: StepRun[],
): EdgeRuntimeState {
  const sourceNode =
    workflow.nodes.find(
      (node) =>
        node.id ===
        edge.source,
    );

  /*
   * Validation에서 잡히는 상태지만
   * Runtime에서는 안전하게 INACTIVE 처리한다.
   */
  if (!sourceNode) {
    return "INACTIVE";
  }

  /*
   * Input Node는 별도의 StepRun이 없으므로
   * 해당 Edge는 처음부터 활성화된 것으로 본다.
   */
  if (
    sourceNode.type ===
    "input"
  ) {
    return "ACTIVE";
  }

  const sourceStep =
    stepRuns.find(
      (stepRun) =>
        stepRun.nodeId ===
        sourceNode.id,
    );

  if (!sourceStep) {
    return "UNRESOLVED";
  }

  /*
   * 상위 Branch 자체가 SKIPPED 되었다면
   * 그 아래 Edge도 비활성화된다.
   */
  if (
    sourceStep.status ===
    "SKIPPED"
  ) {
    return "INACTIVE";
  }

  /*
   * 아직 실행 여부가 결정되지 않은 상태.
   */
  if (
    sourceStep.status ===
      "PENDING" ||
    sourceStep.status ===
      "QUEUED" ||
    sourceStep.status ===
      "RUNNING" ||
    sourceStep.status ===
      "WAITING_APPROVAL"
  ) {
    return "UNRESOLVED";
  }

  /*
   * FAILED / CANCELLED는 Run 자체가 종료되는 흐름이므로
   * 이 Node를 실행 가능하게 만들어서는 안 된다.
   */
  if (
    sourceStep.status ===
      "FAILED" ||
    sourceStep.status ===
      "CANCELLED"
  ) {
    return "UNRESOLVED";
  }

  if (
    sourceStep.status !==
    "COMPLETED"
  ) {
    return "UNRESOLVED";
  }

  /*
   * 일반 Node가 완료된 경우
   * Edge는 그대로 활성화된다.
   */
  if (
    sourceNode.type !==
    "condition"
  ) {
    return "ACTIVE";
  }

  /*
   * Condition Node가 완료되면 output에
   * selectedEdgeIds가 기록된다.
   */
  const selectedEdgeIds =
    getSelectedEdgeIds(
      sourceStep.output,
    );

  /*
   * Condition은 COMPLETED인데 정상적인
   * 선택 결과가 없다면 안전하게 비활성 처리.
   */
  if (
    !selectedEdgeIds
  ) {
    return "INACTIVE";
  }

  return selectedEdgeIds.has(
    edge.id,
  )
    ? "ACTIVE"
    : "INACTIVE";
}

function getSelectedEdgeIds(
  output: unknown,
): Set<string> | undefined {
  if (
    !output ||
    typeof output !==
      "object" ||
    Array.isArray(
      output,
    )
  ) {
    return undefined;
  }

  const record =
    output as Record<
      string,
      unknown
    >;

  const selectedEdgeIds =
    record.selectedEdgeIds;

  if (
    !Array.isArray(
      selectedEdgeIds,
    )
  ) {
    return undefined;
  }

  const ids =
    selectedEdgeIds.filter(
      (
        value,
      ): value is string =>
        typeof value ===
        "string",
    );

  return new Set(
    ids,
  );
}