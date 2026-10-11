import type {
  WorkflowEdge,
  WorkflowNode,
} from "../types";

export type WorkflowValidationSeverity =
  | "error"
  | "warning";

export interface WorkflowValidationIssue {
  code: string;

  severity:
    WorkflowValidationSeverity;

  message: string;

  nodeId?: string;

  edgeId?: string;
}

export interface WorkflowValidationResult {
  isValid: boolean;

  errors: WorkflowValidationIssue[];

  warnings: WorkflowValidationIssue[];

  issues: WorkflowValidationIssue[];
}

interface ValidationAgent {
  id: string;

  enabled: boolean;
}

interface WorkflowValidationOptions {
  agents?: ValidationAgent[];
}

export function validateWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  options: WorkflowValidationOptions = {},
): WorkflowValidationResult {
  const issues: WorkflowValidationIssue[] =
    [];

  const nodeIds =
    new Set<string>();

  const duplicateNodeIds =
    new Set<string>();

  for (const node of nodes) {
    if (
      nodeIds.has(
        node.id,
      )
    ) {
      duplicateNodeIds.add(
        node.id,
      );
    }

    nodeIds.add(
      node.id,
    );
  }

  for (
    const duplicateNodeId
    of duplicateNodeIds
  ) {
    issues.push({
      code:
        "DUPLICATE_NODE_ID",

      severity:
        "error",

      nodeId:
        duplicateNodeId,

      message:
        `중복된 Node ID가 있습니다: ${duplicateNodeId}`,
    });
  }

  const inputNodes =
    nodes.filter(
      (node) =>
        node.type ===
        "input",
    );

  const outputNodes =
    nodes.filter(
      (node) =>
        node.type ===
        "output",
    );

  if (
    inputNodes.length ===
    0
  ) {
    issues.push({
      code:
        "MISSING_INPUT_NODE",

      severity:
        "error",

      message:
        "Input Node가 없습니다.",
    });
  }

  if (
    outputNodes.length ===
    0
  ) {
    issues.push({
      code:
        "MISSING_OUTPUT_NODE",

      severity:
        "error",

      message:
        "Output Node가 없습니다.",
    });
  }

  if (
    inputNodes.length >
    1
  ) {
    issues.push({
      code:
        "MULTIPLE_INPUT_NODES",

      severity:
        "warning",

      message:
        `Input Node가 ${inputNodes.length}개 있습니다. 현재 Workflow는 하나의 Input Node를 사용하는 것을 권장합니다.`,
    });
  }

  if (
    outputNodes.length >
    1
  ) {
    issues.push({
      code:
        "MULTIPLE_OUTPUT_NODES",

      severity:
        "warning",

      message:
        `Output Node가 ${outputNodes.length}개 있습니다. 현재 Workflow는 하나의 Output Node를 사용하는 것을 권장합니다.`,
    });
  }

  /*
   * 존재하는 Node끼리 연결된
   * 정상 Edge만 Graph 분석에 사용한다.
   */
  const validEdges =
    edges.filter(
      (edge) => {
        const sourceExists =
          nodeIds.has(
            edge.source,
          );

        const targetExists =
          nodeIds.has(
            edge.target,
          );

        if (
          !sourceExists
        ) {
          issues.push({
            code:
              "INVALID_EDGE_SOURCE",

            severity:
              "error",

            edgeId:
              edge.id,

            message:
              `Edge "${edge.id}"가 존재하지 않는 Source Node "${edge.source}"를 참조합니다.`,
          });
        }

        if (
          !targetExists
        ) {
          issues.push({
            code:
              "INVALID_EDGE_TARGET",

            severity:
              "error",

            edgeId:
              edge.id,

            message:
              `Edge "${edge.id}"가 존재하지 않는 Target Node "${edge.target}"를 참조합니다.`,
          });
        }

        if (
          sourceExists &&
          targetExists &&
          edge.source ===
            edge.target
        ) {
          issues.push({
            code:
              "SELF_REFERENCING_EDGE",

            severity:
              "error",

            edgeId:
              edge.id,

            nodeId:
              edge.source,

            message:
              `"${getNodeName(nodes, edge.source)}" Node가 자기 자신에게 연결되어 있습니다.`,
          });
        }

        return (
          sourceExists &&
          targetExists &&
          edge.source !==
            edge.target
        );
      },
    );

  const outgoingMap =
    createAdjacencyMap(
      nodes,
    );

  const incomingMap =
    createAdjacencyMap(
      nodes,
    );

  for (
    const edge
    of validEdges
  ) {
    outgoingMap
      .get(
        edge.source,
      )
      ?.add(
        edge.target,
      );

    incomingMap
      .get(
        edge.target,
      )
      ?.add(
        edge.source,
      );
  }

  /*
   * Input Node는 시작점이기 때문에
   * Incoming Edge가 있으면 구조적으로 잘못된 것으로 본다.
   */
  for (
    const inputNode
    of inputNodes
  ) {
    const incoming =
      incomingMap.get(
        inputNode.id,
      );

    if (
      incoming &&
      incoming.size >
        0
    ) {
      issues.push({
        code:
          "INPUT_HAS_INCOMING_EDGE",

        severity:
          "error",

        nodeId:
          inputNode.id,

        message:
          `Input Node "${inputNode.name}"에 들어오는 Edge가 있습니다.`,
      });
    }
  }

  /*
   * Output은 종료점이기 때문에
   * Output 이후로 실행되는 Node가 있으면 안 된다.
   */
  for (
    const outputNode
    of outputNodes
  ) {
    const outgoing =
      outgoingMap.get(
        outputNode.id,
      );

    if (
      outgoing &&
      outgoing.size >
        0
    ) {
      issues.push({
        code:
          "OUTPUT_HAS_OUTGOING_EDGE",

        severity:
          "error",

        nodeId:
          outputNode.id,

        message:
          `Output Node "${outputNode.name}"에서 나가는 Edge가 있습니다.`,
      });
    }

    const incoming =
      incomingMap.get(
        outputNode.id,
      );

    if (
      !incoming ||
      incoming.size ===
        0
    ) {
      issues.push({
        code:
          "OUTPUT_HAS_NO_INPUT",

        severity:
          "error",

        nodeId:
          outputNode.id,

        message:
          `Output Node "${outputNode.name}"로 들어오는 실행 경로가 없습니다.`,
      });
    }
  }

  /*
   * 완전히 연결되지 않은 Node 검사.
   */
  for (
    const node
    of nodes
  ) {
    const incoming =
      incomingMap.get(
        node.id,
      );

    const outgoing =
      outgoingMap.get(
        node.id,
      );

    if (
      (
        incoming?.size ??
        0
      ) ===
        0 &&
      (
        outgoing?.size ??
        0
      ) ===
        0
    ) {
      /*
       * Node가 하나밖에 없는 경우에도
       * Input/Output 누락 검사가 이미 수행되므로
       * 동일한 메시지가 과도하게 나오는 것을 방지한다.
       */
      if (
        nodes.length >
        1
      ) {
        issues.push({
          code:
            "ISOLATED_NODE",

          severity:
            "error",

          nodeId:
            node.id,

          message:
            `"${node.name}" Node가 다른 Node와 연결되어 있지 않습니다.`,
        });
      }
    }
  }

  /*
   * Agent Node 설정 검사.
   */
  const agentMap =
    new Map(
      (
        options.agents ??
        []
      ).map(
        (agent) => [
          agent.id,
          agent,
        ],
      ),
    );

  for (
    const node
    of nodes
  ) {
    if (
      node.type !==
      "agent"
    ) {
      continue;
    }

    if (
      !node.agentId
    ) {
      issues.push({
        code:
          "AGENT_NOT_ASSIGNED",

        severity:
          "error",

        nodeId:
          node.id,

        message:
          `Agent Node "${node.name}"에 Agent가 지정되어 있지 않습니다.`,
      });

      continue;
    }

    /*
     * Agent 목록을 전달받았을 때만
     * 실제 존재 여부를 확인한다.
     */
    if (
      options.agents
    ) {
      const agent =
        agentMap.get(
          node.agentId,
        );

      if (!agent) {
        issues.push({
          code:
            "AGENT_NOT_FOUND",

          severity:
            "error",

          nodeId:
            node.id,

          message:
            `"${node.name}" Node가 존재하지 않는 Agent "${node.agentId}"를 참조하고 있습니다.`,
        });

        continue;
      }

      if (
        !agent.enabled
      ) {
        issues.push({
          code:
            "AGENT_DISABLED",

          severity:
            "error",

          nodeId:
            node.id,

          message:
            `"${node.name}" Node에 지정된 Agent가 비활성화되어 있습니다.`,
        });
      }
    }
  }

  /*
   * Condition Node는 최소 두 갈래의
   * 분기가 있어야 의미가 있다.
   *
   * 실제 Condition 표현식 평가 및
   * 특정 Edge 선택은 STEP 41에서 구현한다.
   */
  for (
    const node
    of nodes
  ) {
    if (
      node.type !==
      "condition"
    ) {
      continue;
    }

    const outgoingEdges =
      validEdges.filter(
        (edge) =>
          edge.source ===
          node.id,
      );

    if (
      outgoingEdges.length <
      2
    ) {
      issues.push({
        code:
          "CONDITION_BRANCH_MISSING",

        severity:
          "error",

        nodeId:
          node.id,

        message:
          `Condition Node "${node.name}"에는 최소 2개의 분기 Edge가 필요합니다.`,
      });
    }
  }

  /*
   * Cycle 검사.
   *
   * 현재 Orchestrator는 DAG 기반이므로
   * Cycle이 존재하면 실행할 수 없다.
   */
  if (
    hasCycle(
      nodes,
      outgoingMap,
    )
  ) {
    issues.push({
      code:
        "WORKFLOW_CYCLE",

      severity:
        "error",

      message:
        "Workflow에 순환 연결(Cycle)이 있습니다. 현재 실행 엔진은 DAG Workflow만 지원합니다.",
    });
  }

  /*
   * Input으로부터 접근 가능한 Node 검사.
   */
  if (
    inputNodes.length >
    0
  ) {
    const reachableFromInput =
      traverseGraph(
        inputNodes.map(
          (node) =>
            node.id,
        ),
        outgoingMap,
      );

    for (
      const node
      of nodes
    ) {
      if (
        node.type ===
        "input"
      ) {
        continue;
      }

      if (
        !reachableFromInput.has(
          node.id,
        )
      ) {
        issues.push({
          code:
            "NODE_UNREACHABLE_FROM_INPUT",

          severity:
            "error",

          nodeId:
            node.id,

          message:
            `"${node.name}" Node는 Input Node에서 도달할 수 없습니다.`,
        });
      }
    }
  }

  /*
   * 각 Node에서 Output으로 도달 가능한지 검사.
   *
   * incomingMap을 역방향 그래프로 사용하면
   * Output에서 역으로 모든 선행 Node를 탐색할 수 있다.
   */
  if (
    outputNodes.length >
    0
  ) {
    const canReachOutput =
      traverseGraph(
        outputNodes.map(
          (node) =>
            node.id,
        ),
        incomingMap,
      );

    for (
      const node
      of nodes
    ) {
      if (
        node.type ===
        "output"
      ) {
        continue;
      }

      if (
        !canReachOutput.has(
          node.id,
        )
      ) {
        issues.push({
          code:
            "NODE_CANNOT_REACH_OUTPUT",

          severity:
            "error",

          nodeId:
            node.id,

          message:
            `"${node.name}" Node에서 Output Node까지 이어지는 실행 경로가 없습니다.`,
        });
      }
    }
  }

  /*
   * 최종적으로 Input → Output 경로가
   * 하나라도 존재하는지 검사한다.
   */
  if (
    inputNodes.length >
      0 &&
    outputNodes.length >
      0
  ) {
    const reachableFromInput =
      traverseGraph(
        inputNodes.map(
          (node) =>
            node.id,
        ),
        outgoingMap,
      );

    const outputReachable =
      outputNodes.some(
        (outputNode) =>
          reachableFromInput.has(
            outputNode.id,
          ),
      );

    if (
      !outputReachable
    ) {
      issues.push({
        code:
          "NO_INPUT_OUTPUT_PATH",

        severity:
          "error",

        message:
          "Input Node에서 Output Node까지 연결되는 실행 경로가 없습니다.",
      });
    }
  }

  const errors =
    issues.filter(
      (issue) =>
        issue.severity ===
        "error",
    );

  const warnings =
    issues.filter(
      (issue) =>
        issue.severity ===
        "warning",
    );

  return {
    isValid:
      errors.length ===
      0,

    errors,

    warnings,

    issues,
  };
}

export function formatWorkflowValidationMessage(
  result: WorkflowValidationResult,
) {
  const sections: string[] =
    [];

  if (
    result.errors.length >
    0
  ) {
    sections.push(
      [
        `오류 ${result.errors.length}개`,
        ...result.errors.map(
          (
            issue,
            index,
          ) =>
            `${index + 1}. ${issue.message}`,
        ),
      ].join(
        "\n",
      ),
    );
  }

  if (
    result.warnings.length >
    0
  ) {
    sections.push(
      [
        `경고 ${result.warnings.length}개`,
        ...result.warnings.map(
          (
            issue,
            index,
          ) =>
            `${index + 1}. ${issue.message}`,
        ),
      ].join(
        "\n",
      ),
    );
  }

  if (
    sections.length ===
    0
  ) {
    return "Workflow 구조가 정상입니다.";
  }

  return sections.join(
    "\n\n",
  );
}

function createAdjacencyMap(
  nodes: WorkflowNode[],
) {
  const map =
    new Map<
      string,
      Set<string>
    >();

  for (
    const node
    of nodes
  ) {
    map.set(
      node.id,
      new Set<string>(),
    );
  }

  return map;
}

function traverseGraph(
  startNodeIds: string[],
  adjacencyMap: Map<
    string,
    Set<string>
  >,
) {
  const visited =
    new Set<string>();

  const queue =
    [...startNodeIds];

  while (
    queue.length >
    0
  ) {
    const current =
      queue.shift();

    if (
      !current ||
      visited.has(
        current,
      )
    ) {
      continue;
    }

    visited.add(
      current,
    );

    const nextNodes =
      adjacencyMap.get(
        current,
      );

    if (
      !nextNodes
    ) {
      continue;
    }

    for (
      const nextNode
      of nextNodes
    ) {
      if (
        !visited.has(
          nextNode,
        )
      ) {
        queue.push(
          nextNode,
        );
      }
    }
  }

  return visited;
}

function hasCycle(
  nodes: WorkflowNode[],
  outgoingMap: Map<
    string,
    Set<string>
  >,
) {
  const indegree =
    new Map<
      string,
      number
    >();

  for (
    const node
    of nodes
  ) {
    indegree.set(
      node.id,
      0,
    );
  }

  for (
    const targets
    of outgoingMap.values()
  ) {
    for (
      const target
      of targets
    ) {
      indegree.set(
        target,
        (
          indegree.get(
            target,
          ) ??
          0
        ) +
          1,
      );
    }
  }

  const queue =
    nodes
      .filter(
        (node) =>
          (
            indegree.get(
              node.id,
            ) ??
            0
          ) ===
          0,
      )
      .map(
        (node) =>
          node.id,
      );

  let processedCount =
    0;

  while (
    queue.length >
    0
  ) {
    const current =
      queue.shift();

    if (
      !current
    ) {
      continue;
    }

    processedCount +=
      1;

    const targets =
      outgoingMap.get(
        current,
      );

    if (
      !targets
    ) {
      continue;
    }

    for (
      const target
      of targets
    ) {
      const nextIndegree =
        (
          indegree.get(
            target,
          ) ??
          0
        ) -
        1;

      indegree.set(
        target,
        nextIndegree,
      );

      if (
        nextIndegree ===
        0
      ) {
        queue.push(
          target,
        );
      }
    }
  }

  return (
    processedCount !==
    nodes.length
  );
}

function getNodeName(
  nodes: WorkflowNode[],
  nodeId: string,
) {
  return (
    nodes.find(
      (node) =>
        node.id ===
        nodeId,
    )?.name ??
    nodeId
  );
}