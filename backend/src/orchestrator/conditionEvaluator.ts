import type {
  WorkflowCondition,
  WorkflowEdge,
} from "../modules/workflows/workflow.types.js";

export interface ConditionEvaluation {
  edgeId: string;
  targetId: string;
  condition?: WorkflowCondition;
  actualValue?: unknown;
  matched: boolean;
  fallback: boolean;
}

export interface ConditionSelection {
  selectedEdgeIds: string[];
  selectedTargetIds: string[];
  evaluations: ConditionEvaluation[];
}

export function buildConditionContext(
  dependencyOutputs: Record<
    string,
    unknown
  >,
): Record<string, unknown> {
  const dependencyEntries =
    Object.entries(
      dependencyOutputs,
    );

  const context: Record<
    string,
    unknown
  > = {
    dependencies:
      dependencyOutputs,
  };

  /*
   * 선행 Node가 하나뿐인 경우에는
   * 그 결과를 최상위에도 펼쳐준다.
   *
   * 예:
   *
   * {
   *   "analysis": {
   *     "score": 0.9
   *   }
   * }
   *
   * condition.field = "score"
   *
   * 처럼 사용할 수 있다.
   */
  if (
    dependencyEntries.length ===
    1
  ) {
    const onlyOutput =
      dependencyEntries[0]?.[1];

    if (
      isRecord(
        onlyOutput,
      )
    ) {
      Object.assign(
        context,
        onlyOutput,
      );
    }

    context.value =
      onlyOutput;
  }

  return context;
}

export function selectConditionEdges(
  edges: WorkflowEdge[],
  context: Record<
    string,
    unknown
  >,
): ConditionSelection {
  const evaluations:
    ConditionEvaluation[] =
      [];

  const matchingEdges:
    WorkflowEdge[] =
      [];

  const fallbackEdges:
    WorkflowEdge[] =
      [];

  for (
    const edge
    of edges
  ) {
    if (
      !edge.condition
    ) {
      fallbackEdges.push(
        edge,
      );

      evaluations.push({
        edgeId:
          edge.id,

        targetId:
          edge.target,

        matched:
          false,

        fallback:
          true,
      });

      continue;
    }

    const actualValue =
      getValueByPath(
        context,
        edge.condition.field,
      );

    const matched =
      evaluateCondition(
        actualValue,
        edge.condition,
      );

    evaluations.push({
      edgeId:
        edge.id,

      targetId:
        edge.target,

      condition:
        edge.condition,

      actualValue,

      matched,

      fallback:
        false,
    });

    if (matched) {
      matchingEdges.push(
        edge,
      );
    }
  }

  /*
   * 조건을 만족한 Edge가 있으면
   * 해당 Edge들을 선택한다.
   */
  if (
    matchingEdges.length >
    0
  ) {
    return {
      selectedEdgeIds:
        matchingEdges.map(
          (edge) =>
            edge.id,
        ),

      selectedTargetIds:
        matchingEdges.map(
          (edge) =>
            edge.target,
        ),

      evaluations,
    };
  }

  /*
   * 조건을 만족한 Edge가 없으면
   * condition이 없는 Edge를
   * fallback branch로 사용한다.
   */
  if (
    fallbackEdges.length >
    0
  ) {
    const fallbackIds =
      new Set(
        fallbackEdges.map(
          (edge) =>
            edge.id,
        ),
      );

    const nextEvaluations =
      evaluations.map(
        (evaluation) =>
          fallbackIds.has(
            evaluation.edgeId,
          )
            ? {
                ...evaluation,

                matched:
                  true,
              }
            : evaluation,
      );

    return {
      selectedEdgeIds:
        fallbackEdges.map(
          (edge) =>
            edge.id,
        ),

      selectedTargetIds:
        fallbackEdges.map(
          (edge) =>
            edge.target,
        ),

      evaluations:
        nextEvaluations,
    };
  }

  throw new Error(
    "Condition Node에서 만족하는 분기를 찾지 못했습니다. 조건식 또는 기본 분기 Edge를 확인하세요.",
  );
}

function evaluateCondition(
  actualValue: unknown,
  condition: WorkflowCondition,
): boolean {
  const expectedValue =
    condition.value;

  switch (
    condition.operator
  ) {
    case "equals":
      return areEqual(
        actualValue,
        expectedValue,
      );

    case "not_equals":
      return !areEqual(
        actualValue,
        expectedValue,
      );

    case "contains":
      return containsValue(
        actualValue,
        expectedValue,
      );

    case "gt":
      return compareNumbers(
        actualValue,
        expectedValue,
        (
          actual,
          expected,
        ) =>
          actual >
          expected,
      );

    case "gte":
      return compareNumbers(
        actualValue,
        expectedValue,
        (
          actual,
          expected,
        ) =>
          actual >=
          expected,
      );

    case "lt":
      return compareNumbers(
        actualValue,
        expectedValue,
        (
          actual,
          expected,
        ) =>
          actual <
          expected,
      );

    case "lte":
      return compareNumbers(
        actualValue,
        expectedValue,
        (
          actual,
          expected,
        ) =>
          actual <=
          expected,
      );

    default:
      return false;
  }
}

function areEqual(
  actualValue: unknown,
  expectedValue: unknown,
) {
  if (
    actualValue ===
    expectedValue
  ) {
    return true;
  }

  /*
   * Builder에서 숫자/boolean이 문자열로
   * 저장될 가능성을 고려해서 기본적인
   * scalar 비교를 한 번 더 수행한다.
   */
  if (
    isScalar(
      actualValue,
    ) &&
    isScalar(
      expectedValue,
    )
  ) {
    return (
      String(
        actualValue,
      ) ===
      String(
        expectedValue,
      )
    );
  }

  return false;
}

function containsValue(
  actualValue: unknown,
  expectedValue: unknown,
) {
  if (
    typeof actualValue ===
    "string"
  ) {
    return actualValue.includes(
      String(
        expectedValue ??
          "",
      ),
    );
  }

  if (
    Array.isArray(
      actualValue,
    )
  ) {
    return actualValue.some(
      (item) =>
        areEqual(
          item,
          expectedValue,
        ),
    );
  }

  if (
    isRecord(
      actualValue,
    ) &&
    typeof expectedValue ===
      "string"
  ) {
    return Object.prototype.hasOwnProperty.call(
      actualValue,
      expectedValue,
    );
  }

  return false;
}

function compareNumbers(
  actualValue: unknown,
  expectedValue: unknown,
  compare: (
    actual: number,
    expected: number,
  ) => boolean,
) {
  const actualNumber =
    toNumber(
      actualValue,
    );

  const expectedNumber =
    toNumber(
      expectedValue,
    );

  if (
    actualNumber ===
      undefined ||
    expectedNumber ===
      undefined
  ) {
    return false;
  }

  return compare(
    actualNumber,
    expectedNumber,
  );
}

function toNumber(
  value: unknown,
): number | undefined {
  if (
    typeof value ===
      "number" &&
    Number.isFinite(
      value,
    )
  ) {
    return value;
  }

  if (
    typeof value !==
    "string"
  ) {
    return undefined;
  }

  const trimmed =
    value.trim();

  if (!trimmed) {
    return undefined;
  }

  const numberValue =
    Number(
      trimmed,
    );

  if (
    !Number.isFinite(
      numberValue,
    )
  ) {
    return undefined;
  }

  return numberValue;
}

function getValueByPath(
  source: unknown,
  path: string,
): unknown {
  const trimmedPath =
    path.trim();

  if (!trimmedPath) {
    return source;
  }

  const segments =
    trimmedPath
      .split(".")
      .map(
        (segment) =>
          segment.trim(),
      )
      .filter(
        Boolean,
      );

  let current:
    unknown =
      source;

  for (
    const segment
    of segments
  ) {
    if (
      !isRecord(
        current,
      )
    ) {
      return undefined;
    }

    current =
      current[
        segment
      ];
  }

  return current;
}

function isRecord(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  );
}

function isScalar(
  value: unknown,
): value is
  | string
  | number
  | boolean {
  return (
    typeof value ===
      "string" ||
    typeof value ===
      "number" ||
    typeof value ===
      "boolean"
  );
}