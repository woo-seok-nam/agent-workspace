import type {
  WorkflowEdge,
  WorkflowNode,
} from "../types";

export interface WorkflowValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): WorkflowValidationResult {
  const errors: string[] = [];

  if (nodes.length === 0) {
    errors.push("Workflow에 Node가 없습니다.");
  }

  const inputNodes = nodes.filter(
    (node) => node.type === "input",
  );

  const outputNodes = nodes.filter(
    (node) => node.type === "output",
  );

  if (inputNodes.length === 0) {
    errors.push(
      "Workflow에는 최소 하나의 Input Node가 필요합니다.",
    );
  }

  if (outputNodes.length === 0) {
    errors.push(
      "Workflow에는 최소 하나의 Output Node가 필요합니다.",
    );
  }

  for (const edge of edges) {
    const sourceExists = nodes.some(
      (node) => node.id === edge.source,
    );

    const targetExists = nodes.some(
      (node) => node.id === edge.target,
    );

    if (!sourceExists || !targetExists) {
      errors.push(
        `잘못된 Edge가 존재합니다: ${edge.source} → ${edge.target}`,
      );
    }

    if (edge.source === edge.target) {
      errors.push(
        `Node 자기 자신으로 연결할 수 없습니다: ${edge.source}`,
      );
    }
  }

  if (hasCycle(nodes, edges)) {
    errors.push(
      "Workflow에 순환 연결(Cycle)이 존재합니다.",
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function hasCycle(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): boolean {
  const adjacency = new Map<string, string[]>();

  nodes.forEach((node) => {
    adjacency.set(node.id, []);
  });

  edges.forEach((edge) => {
    adjacency.get(edge.source)?.push(edge.target);
  });

  const visiting = new Set<string>();
  const visited = new Set<string>();

  const dfs = (nodeId: string): boolean => {
    if (visiting.has(nodeId)) {
      return true;
    }

    if (visited.has(nodeId)) {
      return false;
    }

    visiting.add(nodeId);

    const neighbors =
      adjacency.get(nodeId) ?? [];

    for (const neighbor of neighbors) {
      if (dfs(neighbor)) {
        return true;
      }
    }

    visiting.delete(nodeId);
    visited.add(nodeId);

    return false;
  };

  for (const node of nodes) {
    if (dfs(node.id)) {
      return true;
    }
  }

  return false;
}