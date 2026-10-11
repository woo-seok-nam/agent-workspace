import {
  editRun,
  editStepRun,
  getRun,
} from "../modules/runs/run.service.js";

import {
  getWorkflow,
} from "../modules/workflows/workflow.service.js";

import type {
  ExecutionLog,
} from "../modules/runs/run.types.js";

import type {
  WorkflowNode,
} from "../modules/workflows/workflow.types.js";

import {
  canExecuteNode,
  getDependencyOutputs,
} from "./graph.js";

import {
  executeNode,
} from "./nodeExecutor.js";

import {
  classifyExecutionError,
  getRetryDelay,
  sleep,
} from "./retryPolicy.js";

function createLog(
  message: string,
  level:
    | "info"
    | "warning"
    | "error" =
    "info",
): ExecutionLog {
  return {
    id:
      `log-${crypto.randomUUID()}`,

    timestamp:
      new Date().toISOString(),

    level,

    message,
  };
}

function getErrorMessage(
  error: unknown,
) {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  if (
    typeof error ===
    "string"
  ) {
    return error;
  }

  try {
    return JSON.stringify(
      error,
    );
  } catch {
    return "알 수 없는 오류가 발생했습니다.";
  }
}

export async function startWorkflowRun(
  runId: string,
) {
  const existingRun =
    await getRun(
      runId,
    );

  if (!existingRun) {
    throw new Error(
      "Run을 찾을 수 없습니다.",
    );
  }

  if (
    existingRun.status ===
      "RUNNING" ||
    existingRun.status ===
      "WAITING_APPROVAL"
  ) {
    return existingRun;
  }

  if (
    existingRun.status ===
      "COMPLETED" ||
    existingRun.status ===
      "CANCELLED"
  ) {
    return existingRun;
  }

  const workflow =
    await getWorkflow(
      existingRun.workflowId,
    );

  if (!workflow) {
    throw new Error(
      "Run에 연결된 Workflow를 찾을 수 없습니다.",
    );
  }

  await editRun(
    runId,
    {
      status:
        "RUNNING",

      startedAt:
        existingRun.startedAt ??
        new Date().toISOString(),

      completedAt:
        null,
    },
  );

  await continueWorkflowRun(
    runId,
  );

  const updatedRun =
    await getRun(
      runId,
    );

  if (!updatedRun) {
    throw new Error(
      "실행 결과를 불러오지 못했습니다.",
    );
  }

  return updatedRun;
}

export async function continueWorkflowRun(
  runId: string,
): Promise<void> {
  while (true) {
    const run =
      await getRun(
        runId,
      );

    if (!run) {
      throw new Error(
        "Run을 찾을 수 없습니다.",
      );
    }

    if (
      run.status ===
      "WAITING_APPROVAL"
    ) {
      return;
    }

    if (
      run.status ===
        "FAILED" ||
      run.status ===
        "CANCELLED" ||
      run.status ===
        "COMPLETED"
    ) {
      return;
    }

    const workflow =
      await getWorkflow(
        run.workflowId,
      );

    if (!workflow) {
      throw new Error(
        "Workflow를 찾을 수 없습니다.",
      );
    }

    const pendingSteps =
      run.stepRuns.filter(
        (stepRun) =>
          stepRun.status ===
          "PENDING",
      );

    if (
      pendingSteps.length ===
      0
    ) {
      const hasFailure =
        run.stepRuns.some(
          (stepRun) =>
            stepRun.status ===
            "FAILED",
        );

      if (hasFailure) {
        await editRun(
          runId,
          {
            status:
              "FAILED",

            completedAt:
              new Date().toISOString(),
          },
        );

        return;
      }

      const hasWaitingApproval =
        run.stepRuns.some(
          (stepRun) =>
            stepRun.status ===
            "WAITING_APPROVAL",
        );

      if (
        hasWaitingApproval
      ) {
        await editRun(
          runId,
          {
            status:
              "WAITING_APPROVAL",
          },
        );

        return;
      }

      const totalTokenUsage =
        run.stepRuns.reduce(
          (
            sum,
            stepRun,
          ) =>
            sum +
            stepRun.tokenUsage,
          0,
        );

      const totalCost =
        run.stepRuns.reduce(
          (
            sum,
            stepRun,
          ) =>
            sum +
            stepRun.cost,
          0,
        );

      await editRun(
        runId,
        {
          status:
            "COMPLETED",

          completedAt:
            new Date().toISOString(),

          tokenUsage:
            totalTokenUsage,

          cost:
            totalCost,
        },
      );

      return;
    }

    const executableSteps =
      pendingSteps.filter(
        (stepRun) =>
          canExecuteNode(
            workflow,
            stepRun.nodeId,
            run.stepRuns,
          ),
      );

    if (
      executableSteps.length ===
      0
    ) {
      const hasRunningStep =
        run.stepRuns.some(
          (stepRun) =>
            stepRun.status ===
            "RUNNING",
        );

      if (
        hasRunningStep
      ) {
        return;
      }

      await editRun(
        runId,
        {
          status:
            "FAILED",

          completedAt:
            new Date().toISOString(),
        },
      );

      return;
    }

    const approvalStep =
      executableSteps.find(
        (stepRun) => {
          const node =
            workflow.nodes.find(
              (
                workflowNode,
              ) =>
                workflowNode.id ===
                stepRun.nodeId,
            );

          return (
            node?.config
              ?.requireApproval ===
              true &&
            stepRun.approvalStatus !==
              "APPROVED"
          );
        },
      );

    if (
      approvalStep
    ) {
      const approvalNode =
        workflow.nodes.find(
          (node) =>
            node.id ===
            approvalStep.nodeId,
        );

      await editStepRun(
        runId,
        approvalStep.nodeId,
        {
          status:
            "WAITING_APPROVAL",

          approvalStatus:
            "PENDING",

          logs: [
            ...approvalStep.logs,

            createLog(
              `${approvalNode?.name ?? approvalStep.nodeId} Step이 사용자 승인을 기다리고 있습니다.`,
            ),
          ],
        },
      );

      await editRun(
        runId,
        {
          status:
            "WAITING_APPROVAL",
        },
      );

      return;
    }

    /*
     * 현재 실행 가능한 Step은 병렬 실행한다.
     *
     * 각각의 Step 내부에서는
     * Retry / Backoff가 독립적으로 적용된다.
     */
    await Promise.all(
      executableSteps.map(
        async (
          stepRun,
        ) => {
          const node =
            workflow.nodes.find(
              (
                workflowNode,
              ) =>
                workflowNode.id ===
                stepRun.nodeId,
            );

          if (!node) {
            await editStepRun(
              runId,
              stepRun.nodeId,
              {
                status:
                  "FAILED",

                completedAt:
                  new Date().toISOString(),

                logs: [
                  ...stepRun.logs,

                  createLog(
                    "Workflow Node를 찾지 못했습니다.",
                    "error",
                  ),
                ],
              },
            );

            return;
          }

          await executeWorkflowNode(
            runId,
            workflow,
            node,
          );
        },
      ),
    );

    const afterExecution =
      await getRun(
        runId,
      );

    if (
      !afterExecution
    ) {
      return;
    }

    const failed =
      afterExecution.stepRuns.some(
        (stepRun) =>
          stepRun.status ===
          "FAILED",
      );

    if (
      failed
    ) {
      await editRun(
        runId,
        {
          status:
            "FAILED",

          completedAt:
            new Date().toISOString(),
        },
      );

      return;
    }
  }
}

export async function approveWorkflowStep(
  runId: string,
  nodeId: string,
) {
  const run =
    await getRun(
      runId,
    );

  if (!run) {
    throw new Error(
      "Run을 찾을 수 없습니다.",
    );
  }

  const stepRun =
    run.stepRuns.find(
      (step) =>
        step.nodeId ===
        nodeId,
    );

  if (!stepRun) {
    throw new Error(
      "승인할 Step을 찾을 수 없습니다.",
    );
  }

  if (
    stepRun.status !==
    "WAITING_APPROVAL"
  ) {
    throw new Error(
      "현재 승인 대기 중인 Step이 아닙니다.",
    );
  }

  await editStepRun(
    runId,
    nodeId,
    {
      status:
        "PENDING",

      approvalStatus:
        "APPROVED",

      logs: [
        ...stepRun.logs,

        createLog(
          "사용자가 실행을 승인했습니다.",
        ),
      ],
    },
  );

  await editRun(
    runId,
    {
      status:
        "RUNNING",
    },
  );

  await continueWorkflowRun(
    runId,
  );

  const updatedRun =
    await getRun(
      runId,
    );

  if (!updatedRun) {
    throw new Error(
      "승인 후 Run 상태를 불러오지 못했습니다.",
    );
  }

  return updatedRun;
}

export async function rejectWorkflowStep(
  runId: string,
  nodeId: string,
) {
  const run =
    await getRun(
      runId,
    );

  if (!run) {
    throw new Error(
      "Run을 찾을 수 없습니다.",
    );
  }

  const stepRun =
    run.stepRuns.find(
      (step) =>
        step.nodeId ===
        nodeId,
    );

  if (!stepRun) {
    throw new Error(
      "거절할 Step을 찾을 수 없습니다.",
    );
  }

  if (
    stepRun.status !==
    "WAITING_APPROVAL"
  ) {
    throw new Error(
      "현재 승인 대기 중인 Step이 아닙니다.",
    );
  }

  await editStepRun(
    runId,
    nodeId,
    {
      status:
        "CANCELLED",

      approvalStatus:
        "REJECTED",

      completedAt:
        new Date().toISOString(),

      logs: [
        ...stepRun.logs,

        createLog(
          "사용자가 실행을 거절했습니다.",
          "warning",
        ),
      ],
    },
  );

  await editRun(
    runId,
    {
      status:
        "CANCELLED",

      completedAt:
        new Date().toISOString(),
    },
  );

  const updatedRun =
    await getRun(
      runId,
    );

  if (!updatedRun) {
    throw new Error(
      "거절 후 Run 상태를 불러오지 못했습니다.",
    );
  }

  return updatedRun;
}

async function executeWorkflowNode(
  runId: string,
  workflow: NonNullable<
    Awaited<
      ReturnType<
        typeof getWorkflow
      >
    >
  >,
  node: WorkflowNode,
) {
  const initialRun =
    await getRun(
      runId,
    );

  if (!initialRun) {
    return;
  }

  const initialStepRun =
    initialRun.stepRuns.find(
      (step) =>
        step.nodeId ===
        node.id,
    );

  if (!initialStepRun) {
    return;
  }

  /*
   * retryCount는 "최초 실행 이후 추가 재시도 횟수"다.
   *
   * retryCount = 2이면:
   *
   * 최초 1회
   * + 재시도 2회
   * = 최대 총 3회 실행
   */
  const retryCount =
    Math.max(
      0,
      node.config
        ?.retryCount ??
        2,
    );

  const maximumAttempts =
    retryCount +
    1;

  await editStepRun(
    runId,
    node.id,
    {
      status:
        "RUNNING",

      startedAt:
        initialStepRun.startedAt ??
        new Date().toISOString(),

      completedAt:
        null,

      logs: [
        ...initialStepRun.logs,

        createLog(
          `${node.name} 실행을 시작했습니다.`,
        ),
      ],
    },
  );

  for (
    let attempt =
      1;
    attempt <=
    maximumAttempts;
    attempt +=
      1
  ) {
    const currentRun =
      await getRun(
        runId,
      );

    if (!currentRun) {
      return;
    }

    const currentStepRun =
      currentRun.stepRuns.find(
        (step) =>
          step.nodeId ===
          node.id,
      );

    if (!currentStepRun) {
      return;
    }

    try {
      if (
        attempt >
        1
      ) {
        await editStepRun(
          runId,
          node.id,
          {
            logs: [
              ...currentStepRun.logs,

              createLog(
                `${node.name} 실행을 다시 시도합니다. (${attempt}/${maximumAttempts})`,
                "warning",
              ),
            ],
          },
        );
      }

      const latestRun =
        await getRun(
          runId,
        );

      if (!latestRun) {
        return;
      }

      const dependencyOutputs =
        getDependencyOutputs(
          workflow,
          node.id,
          latestRun.stepRuns,
        );

      const result =
        await executeNode({
          workflow,

          run:
            latestRun,

          node,

          dependencyOutputs,
        });

      const afterExecutionRun =
        await getRun(
          runId,
        );

      const afterExecutionStep =
        afterExecutionRun?.stepRuns.find(
          (step) =>
            step.nodeId ===
            node.id,
        );

      await editStepRun(
        runId,
        node.id,
        {
          status:
            "COMPLETED",

          output:
            result.output,

          tokenUsage:
            result.tokenUsage,

          cost:
            result.cost,

          completedAt:
            new Date().toISOString(),

          logs: [
            ...(afterExecutionStep
              ?.logs ??
              currentStepRun.logs),

            createLog(
              `${node.name} 실행이 완료되었습니다.`,
            ),
          ],
        },
      );

      return;
    } catch (error) {
      const decision =
        classifyExecutionError(
          error,
        );

      const rawErrorMessage =
        getErrorMessage(
          error,
        );

      const latestRun =
        await getRun(
          runId,
        );

      const latestStepRun =
        latestRun?.stepRuns.find(
          (step) =>
            step.nodeId ===
            node.id,
        );

      const currentLogs =
        latestStepRun?.logs ??
        currentStepRun.logs;

      const retriesRemaining =
        attempt <
        maximumAttempts;

      /*
       * 재시도 가능한 오류이면서
       * 아직 retry 횟수가 남아 있다.
       */
      if (
        decision.retryable &&
        retriesRemaining
      ) {
        const retryNumber =
          attempt;

        const delay =
          getRetryDelay(
            retryNumber,
          );

        await editStepRun(
          runId,
          node.id,
          {
            logs: [
              ...currentLogs,

              createLog(
                `${decision.message} ${delay / 1000}초 후 재시도합니다. (${retryNumber}/${retryCount})`,
                "warning",
              ),
            ],
          },
        );

        await sleep(
          delay,
        );

        continue;
      }

      /*
       * 여기까지 왔다면
       *
       * 1. 재시도 불가능한 오류이거나
       * 2. 모든 retry가 소진된 상태다.
       */
      const finalMessage =
        decision.retryable
          ? `${decision.message} 재시도 횟수를 모두 사용했습니다.`
          : decision.message;

      await editStepRun(
        runId,
        node.id,
        {
          status:
            "FAILED",

          completedAt:
            new Date().toISOString(),

          logs: [
            ...currentLogs,

            createLog(
              finalMessage,
              "error",
            ),

            createLog(
              rawErrorMessage,
              "error",
            ),
          ],
        },
      );

      return;
    }
  }
}