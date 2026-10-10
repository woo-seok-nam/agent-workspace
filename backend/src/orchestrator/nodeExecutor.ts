import type {
  NodeExecutionContext,
  NodeExecutionResult,
} from "./orchestrator.types.js";

function delay(
  milliseconds: number,
) {
  return new Promise<void>(
    (resolve) => {
      setTimeout(
        resolve,
        milliseconds,
      );
    },
  );
}

export async function executeNode(
  context: NodeExecutionContext,
): Promise<NodeExecutionResult> {
  const {
    node,
    run,
    dependencyOutputs,
  } =
    context;

  /*
   * STEP 24에서는 실제 LLM API 대신
   * 간단한 실행 결과를 생성한다.
   *
   * 다음 STEP에서 Agent Executor로
   * 교체할 예정.
   */

  await delay(
    700,
  );

  const output = {
    nodeId:
      node.id,

    nodeName:
      node.name,

    agentId:
      node.agentId ??
      null,

    modelId:
      node.modelId ??
      null,

    prompt:
      run.prompt ??
      null,

    dependencyOutputs,

    message:
      `${node.name} 실행이 완료되었습니다.`,
  };

  return {
    output,

    tokenUsage: 0,

    cost: 0,
  };
}