import {
  getRunArtifacts,
} from "../modules/artifacts/artifact.service.js";

import {
  writeMarkdownArtifact,
} from "../modules/artifacts/artifactWriter.js";

import {
  getAgent,
} from "../modules/agents/agent.service.js";

import {
  editRun,
  editStepRun,
  getRun,
  setRunStateValue,
} from "../modules/runs/run.service.js";

import type {
  ExecutionLog,
  StepRun,
  WorkflowRun,
} from "../modules/runs/run.types.js";

import {
  getWorkflow,
} from "../modules/workflows/workflow.service.js";

import type {
  Workflow,
  WorkflowNode,
} from "../modules/workflows/workflow.types.js";

import {
  buildConditionContext,
  selectConditionEdges,
} from "./conditionEvaluator.js";

import {
  canExecuteNode,
  getDependencyOutputs,
  shouldSkipNode,
} from "./graph.js";

import {
  executeNode,
} from "./nodeExecutor.js";

import {
  classifyExecutionError,
  executeWithTimeout,
  getRetryDelay,
  sleep,
} from "./retryPolicy.js";

function createLog(
  message: string,
  level:
    | "info"
    | "warning"
    | "error" = "info",
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

function isRunTerminal(
  run: WorkflowRun,
) {
  return (
    run.status ===
      "COMPLETED" ||
    run.status ===
      "FAILED" ||
    run.status ===
      "CANCELLED"
  );
}

/*
 * Pause된 Run에서 현재 RUNNING 상태인 Step을
 * 다시 PENDING으로 되돌린다.
 *
 * 현재 Provider 요청을 실제 Abort하지 않기 때문에,
 * 요청 결과가 돌아온 뒤 이 함수가 실행되면
 * 그 결과는 버리고 Resume 시 Step을 처음부터 다시 실행한다.
 */
async function restoreStepForPausedRun(
  runId: string,
  nodeId: string,
  message:
    string =
      "Workflow Run이 일시정지되어 현재 Step 결과를 적용하지 않습니다. 재개 시 다시 실행합니다.",
) {
  const run =
    await getRun(
      runId,
    );

  if (!run) {
    return;
  }

  if (
    run.status !==
    "PAUSED"
  ) {
    return;
  }

  const stepRun =
    run.stepRuns.find(
      (step) =>
        step.nodeId ===
        nodeId,
    );

  if (!stepRun) {
    return;
  }

  /*
   * 이미 다른 제어 흐름에서 상태가 바뀌었다면
   * 다시 덮어쓰지 않는다.
   */
  if (
    stepRun.status !==
    "RUNNING"
  ) {
    return;
  }

  await editStepRun(
    runId,
    nodeId,
    {
      status:
        "PENDING",

      completedAt:
        null,

      logs: [
        ...stepRun.logs,

        createLog(
          message,
          "warning",
        ),
      ],
    },
  );
}

/*
 * Node 실행을 계속 진행해도 되는지 검사한다.
 *
 * true:
 *   계속 실행 가능
 *
 * false:
 *   PAUSED 또는 CANCELLED 등의 이유로
 *   현재 Node 실행 흐름을 중단해야 함
 */
async function canContinueNodeExecution(
  runId: string,
  nodeId: string,
): Promise<boolean> {
  const run =
    await getRun(
      runId,
    );

  if (!run) {
    return false;
  }

  if (
    run.status ===
    "PAUSED"
  ) {
    await restoreStepForPausedRun(
      runId,
      nodeId,
    );

    return false;
  }

  if (
    run.status ===
      "CANCELLED" ||
    run.status ===
      "FAILED" ||
    run.status ===
      "COMPLETED"
  ) {
    return false;
  }

  return true;
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
      "PAUSED"
  ) {
    throw new Error(
      "일시정지된 Run은 Resume 기능으로 재개해야 합니다.",
    );
  }

  if (
    isRunTerminal(
      existingRun,
    )
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

    /*
     * STEP 44
     *
     * Pause 상태에서는 새로운 Node를
     * 절대로 시작하지 않는다.
     */
    if (
      run.status ===
      "PAUSED"
    ) {
      return;
    }

    if (
      run.status ===
      "WAITING_APPROVAL"
    ) {
      return;
    }

    if (
      isRunTerminal(
        run,
      )
    ) {
      return;
    }

    /*
     * continueWorkflowRun은 RUNNING 상태에서만
     * 실제 실행을 진행한다.
     */
    if (
      run.status !==
      "RUNNING"
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

      /*
       * RUNNING Step이 있다면 아직 완료 판정을
       * 내려서는 안 된다.
       */
      const hasRunningStep =
        run.stepRuns.some(
          (stepRun) =>
            stepRun.status ===
              "RUNNING" ||
            stepRun.status ===
              "QUEUED",
        );

      if (
        hasRunningStep
      ) {
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

      const finalText =
        findFinalOutputText(
          workflow,
          run.stepRuns,
        );

      if (finalText) {
        await ensureMarkdownArtifact(
          runId,
          finalText,
        );
      }

      /*
       * Artifact 처리 도중 Pause/Cancel이 발생했을 수도
       * 있으므로 최종 상태를 다시 확인한다.
       */
      const beforeCompletion =
        await getRun(
          runId,
        );

      if (
        !beforeCompletion ||
        beforeCompletion.status !==
          "RUNNING"
      ) {
        return;
      }

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

    /*
     * Condition 분기상 더 이상 도달할 수 없는
     * Step을 SKIPPED 처리한다.
     */
    const skippableSteps =
      pendingSteps.filter(
        (stepRun) =>
          shouldSkipNode(
            workflow,
            stepRun.nodeId,
            run.stepRuns,
          ),
      );

    if (
      skippableSteps.length >
      0
    ) {
      /*
       * SKIPPED 처리 직전에도 Run 제어 상태 확인.
       */
      const beforeSkip =
        await getRun(
          runId,
        );

      if (
        !beforeSkip ||
        beforeSkip.status !==
          "RUNNING"
      ) {
        return;
      }

      await Promise.all(
        skippableSteps.map(
          async (
            stepRun,
          ) => {
            const latestRun =
              await getRun(
                runId,
              );

            if (
              !latestRun ||
              latestRun.status !==
                "RUNNING"
            ) {
              return;
            }

            const node =
              workflow.nodes.find(
                (
                  workflowNode,
                ) =>
                  workflowNode.id ===
                  stepRun.nodeId,
              );

            await editStepRun(
              runId,
              stepRun.nodeId,
              {
                status:
                  "SKIPPED",

                completedAt:
                  new Date().toISOString(),

                logs: [
                  ...stepRun.logs,

                  createLog(
                    `${
                      node?.name ??
                      stepRun.nodeId
                    } Step은 Condition 분기에서 선택되지 않아 건너뜁니다.`,
                    "warning",
                  ),
                ],
              },
            );
          },
        ),
      );

      continue;
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

      const beforeFailure =
        await getRun(
          runId,
        );

      if (
        !beforeFailure ||
        beforeFailure.status !==
          "RUNNING"
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
      const beforeApproval =
        await getRun(
          runId,
        );

      if (
        !beforeApproval ||
        beforeApproval.status !==
          "RUNNING"
      ) {
        return;
      }

      const approvalNode =
        workflow.nodes.find(
          (node) =>
            node.id ===
            approvalStep.nodeId,
        );

      const latestApprovalStep =
        beforeApproval.stepRuns.find(
          (step) =>
            step.nodeId ===
            approvalStep.nodeId,
        );

      if (
        !latestApprovalStep ||
        latestApprovalStep.status !==
          "PENDING"
      ) {
        continue;
      }

      await editStepRun(
        runId,
        approvalStep.nodeId,
        {
          status:
            "WAITING_APPROVAL",

          approvalStatus:
            "PENDING",

          logs: [
            ...latestApprovalStep.logs,

            createLog(
              `${
                approvalNode?.name ??
                approvalStep.nodeId
              } Step이 사용자 승인을 기다리고 있습니다.`,
            ),
          ],
        },
      );

      const afterApprovalStep =
        await getRun(
          runId,
        );

      if (
        !afterApprovalStep ||
        afterApprovalStep.status !==
          "RUNNING"
      ) {
        return;
      }

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
     * 실제 병렬 Node를 시작하기 직전
     * 마지막으로 RUNNING 상태인지 확인한다.
     */
    const beforeExecution =
      await getRun(
        runId,
      );

    if (
      !beforeExecution ||
      beforeExecution.status !==
        "RUNNING"
    ) {
      return;
    }

    await Promise.all(
      executableSteps.map(
        async (
          stepRun,
        ) => {
          const currentRun =
            await getRun(
              runId,
            );

          if (
            !currentRun ||
            currentRun.status !==
              "RUNNING"
          ) {
            return;
          }

          const currentStep =
            currentRun.stepRuns.find(
              (step) =>
                step.nodeId ===
                stepRun.nodeId,
            );

          if (
            !currentStep ||
            currentStep.status !==
              "PENDING"
          ) {
            return;
          }

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
                  ...currentStep.logs,

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

    /*
     * 실행 중 Pause 또는 Cancel이 발생했다면
     * 다음 loop로 넘어가지 않는다.
     */
    if (
      afterExecution.status ===
        "PAUSED" ||
      afterExecution.status ===
        "CANCELLED"
    ) {
      return;
    }

    if (
      afterExecution.status !==
      "RUNNING"
    ) {
      return;
    }

    const failed =
      afterExecution.stepRuns.some(
        (stepRun) =>
          stepRun.status ===
          "FAILED",
      );

    if (failed) {
      const beforeFailure =
        await getRun(
          runId,
        );

      if (
        !beforeFailure ||
        beforeFailure.status !==
          "RUNNING"
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

  if (
    run.status !==
    "WAITING_APPROVAL"
  ) {
    throw new Error(
      "현재 승인 대기 상태의 Run이 아닙니다.",
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

  if (
    run.status !==
    "WAITING_APPROVAL"
  ) {
    throw new Error(
      "현재 승인 대기 상태의 Run이 아닙니다.",
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
  workflow: Workflow,
  node: WorkflowNode,
) {
  /*
   * Node 실행을 시작하기 전에도
   * Run 상태를 반드시 확인한다.
   */
  const initialRun =
    await getRun(
      runId,
    );

  if (
    !initialRun ||
    initialRun.status !==
      "RUNNING"
  ) {
    return;
  }

  const initialStepRun =
    initialRun.stepRuns.find(
      (step) =>
        step.nodeId ===
        node.id,
    );

  if (
    !initialStepRun ||
    initialStepRun.status !==
      "PENDING"
  ) {
    return;
  }

  const agent =
    node.type ===
      "agent" &&
    node.agentId
      ? await getAgent(
          node.agentId,
        )
      : undefined;

  const retryCount =
    node.type ===
    "condition"
      ? 0
      : Math.max(
          0,
          node.config
            ?.retryCount ??
            agent?.retryCount ??
            2,
        );

  const timeoutSeconds =
    node.config
      ?.timeoutSeconds ??
    agent?.timeoutSeconds ??
    60;

  const maximumAttempts =
    retryCount +
    1;

  /*
   * Agent 조회 등의 준비 작업 동안 Pause/Cancel이
   * 발생했을 수도 있으므로 다시 검사한다.
   */
  const beforeStart =
    await getRun(
      runId,
    );

  if (
    !beforeStart ||
    beforeStart.status !==
      "RUNNING"
  ) {
    return;
  }

  const beforeStartStep =
    beforeStart.stepRuns.find(
      (step) =>
        step.nodeId ===
        node.id,
    );

  if (
    !beforeStartStep ||
    beforeStartStep.status !==
      "PENDING"
  ) {
    return;
  }

  await editStepRun(
    runId,
    node.id,
    {
      status:
        "RUNNING",

      startedAt:
        beforeStartStep.startedAt ??
        new Date().toISOString(),

      completedAt:
        null,

      logs: [
        ...beforeStartStep.logs,

        createLog(
          `${node.name} 실행을 시작했습니다. 제한 시간: ${
            timeoutSeconds >
            0
              ? `${timeoutSeconds}초`
              : "없음"
          }, 재시도: ${retryCount}회`,
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
    /*
     * 각 Retry 시작 전 Pause / Cancel 검사.
     */
    const allowedToRun =
      await canContinueNodeExecution(
        runId,
        node.id,
      );

    if (!allowedToRun) {
      return;
    }

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

    if (
      !currentStepRun ||
      currentStepRun.status !==
        "RUNNING"
    ) {
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

        /*
         * Retry 로그 저장 중 상태가 바뀔 수 있으므로
         * 한 번 더 검사한다.
         */
        const canRetry =
          await canContinueNodeExecution(
            runId,
            node.id,
          );

        if (!canRetry) {
          return;
        }
      }

      const latestRun =
        await getRun(
          runId,
        );

      if (
        !latestRun ||
        latestRun.status !==
          "RUNNING"
      ) {
        if (
          latestRun?.status ===
          "PAUSED"
        ) {
          await restoreStepForPausedRun(
            runId,
            node.id,
          );
        }

        return;
      }

      const dependencyOutputs =
        getDependencyOutputs(
          workflow,
          node.id,
          latestRun.stepRuns,
        );

      const result =
        await executeWithTimeout(
          async () => {
            if (
              node.type ===
              "condition"
            ) {
              return executeConditionNode(
                workflow,
                node,
                dependencyOutputs,
                latestRun.prompt,
              );
            }

            return executeNode({
              workflow,

              run:
                latestRun,

              node,

              dependencyOutputs,

              sharedState:
                latestRun.state,
            });
          },

          timeoutSeconds,
        );

      /*
       * 매우 중요:
       *
       * Provider 응답이 도착한 시점에 Run이
       * Pause/Cancel 되었을 수 있다.
       *
       * 이 확인 전에 result.output을 DB에 쓰면
       * CANCELLED 상태를 COMPLETED로 덮어쓸 수 있다.
       */
      const afterProvider =
        await getRun(
          runId,
        );

      if (!afterProvider) {
        return;
      }

      if (
        afterProvider.status ===
        "PAUSED"
      ) {
        await restoreStepForPausedRun(
          runId,
          node.id,
          `${node.name} 실행 중 Workflow가 일시정지되어 반환된 실행 결과를 폐기했습니다. Resume 시 다시 실행합니다.`,
        );

        return;
      }

      if (
        afterProvider.status ===
          "CANCELLED" ||
        afterProvider.status ===
          "FAILED" ||
        afterProvider.status ===
          "COMPLETED"
      ) {
        return;
      }

      if (
        afterProvider.status !==
        "RUNNING"
      ) {
        return;
      }

      const afterProviderStep =
        afterProvider.stepRuns.find(
          (step) =>
            step.nodeId ===
            node.id,
        );

      /*
       * Cancel Controller 등이 Step 상태까지
       * 이미 변경했다면 결과를 절대 저장하지 않는다.
       */
      if (
        !afterProviderStep ||
        afterProviderStep.status !==
          "RUNNING"
      ) {
        return;
      }

      /*
       * STEP 43
       *
       * 실행 결과를 Durable Shared State에 저장.
       */
      await setRunStateValue(
        runId,
        node.id,
        result.output,
      );

      /*
       * Shared State 저장 과정 동안에도
       * Pause/Cancel 가능성이 있으므로 재검사.
       */
      const afterStateSave =
        await getRun(
          runId,
        );

      if (!afterStateSave) {
        return;
      }

      if (
        afterStateSave.status ===
        "PAUSED"
      ) {
        await restoreStepForPausedRun(
          runId,
          node.id,
          `${node.name} 결과 저장 중 Workflow가 일시정지되었습니다. Step은 Resume 시 다시 실행합니다.`,
        );

        return;
      }

      if (
        afterStateSave.status !==
        "RUNNING"
      ) {
        return;
      }

      const afterStateStep =
        afterStateSave.stepRuns.find(
          (step) =>
            step.nodeId ===
            node.id,
        );

      if (
        !afterStateStep ||
        afterStateStep.status !==
          "RUNNING"
      ) {
        return;
      }

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
            ...afterStateStep.logs,

            createLog(
              `${node.name} 실행 결과를 Shared State에 저장했습니다.`,
            ),

            createLog(
              getCompletionLogMessage(
                node,
                result.output,
              ),
            ),
          ],
        },
      );

      return;
    } catch (error) {
      /*
       * Error 처리 전에 Pause/Cancel 여부부터 검사한다.
       *
       * 사용자가 취소했는데 Provider 요청이 에러로
       * 끝났다는 이유로 Step을 FAILED로 덮어쓰면 안 된다.
       */
      const controlledRun =
        await getRun(
          runId,
        );

      if (!controlledRun) {
        return;
      }

      if (
        controlledRun.status ===
        "PAUSED"
      ) {
        await restoreStepForPausedRun(
          runId,
          node.id,
          `${node.name} 실행 중 Workflow가 일시정지되었습니다. 오류 결과는 적용하지 않고 Resume 시 다시 실행합니다.`,
        );

        return;
      }

      if (
        controlledRun.status ===
          "CANCELLED" ||
        controlledRun.status ===
          "COMPLETED"
      ) {
        return;
      }

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

      if (
        !latestRun ||
        latestRun.status !==
          "RUNNING"
      ) {
        return;
      }

      const latestStepRun =
        latestRun.stepRuns.find(
          (step) =>
            step.nodeId ===
            node.id,
        );

      if (
        !latestStepRun ||
        latestStepRun.status !==
          "RUNNING"
      ) {
        return;
      }

      const currentLogs =
        latestStepRun.logs;

      const retriesRemaining =
        attempt <
        maximumAttempts;

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

        /*
         * Retry delay 동안 Pause/Cancel이
         * 발생했는지 반드시 확인한다.
         */
        const canRetryAfterDelay =
          await canContinueNodeExecution(
            runId,
            node.id,
          );

        if (
          !canRetryAfterDelay
        ) {
          return;
        }

        continue;
      }

      /*
       * FAILED 처리 직전 최종 상태 확인.
       */
      const beforeFailure =
        await getRun(
          runId,
        );

      if (
        !beforeFailure ||
        beforeFailure.status !==
          "RUNNING"
      ) {
        return;
      }

      const beforeFailureStep =
        beforeFailure.stepRuns.find(
          (step) =>
            step.nodeId ===
            node.id,
        );

      if (
        !beforeFailureStep ||
        beforeFailureStep.status !==
          "RUNNING"
      ) {
        return;
      }

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
            ...beforeFailureStep.logs,

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

async function executeConditionNode(
  workflow: Workflow,
  node: WorkflowNode,
  dependencyOutputs: Record<
    string,
    unknown
  >,
  prompt?: string,
) {
  const outgoingEdges =
    workflow.edges.filter(
      (edge) =>
        edge.source ===
        node.id,
    );

  const context =
    buildConditionContext(
      dependencyOutputs,
    );

  if (prompt) {
    context.prompt =
      prompt;
  }

  const selection =
    selectConditionEdges(
      outgoingEdges,
      context,
    );

  return {
    output: {
      type:
        "condition",

      selectedEdgeIds:
        selection.selectedEdgeIds,

      selectedTargetIds:
        selection.selectedTargetIds,

      evaluations:
        selection.evaluations,
    },

    tokenUsage:
      0,

    cost:
      0,
  };
}

function getCompletionLogMessage(
  node: WorkflowNode,
  output: unknown,
) {
  if (
    node.type !==
      "condition" ||
    !output ||
    typeof output !==
      "object" ||
    Array.isArray(
      output,
    )
  ) {
    return `${node.name} 실행이 완료되었습니다.`;
  }

  const selectedTargetIds =
    (
      output as Record<
        string,
        unknown
      >
    ).selectedTargetIds;

  if (
    !Array.isArray(
      selectedTargetIds,
    )
  ) {
    return `${node.name} Condition 평가가 완료되었습니다.`;
  }

  const targetNames =
    selectedTargetIds
      .filter(
        (
          value,
        ): value is string =>
          typeof value ===
          "string",
      )
      .map(
        (
          targetId,
        ) =>
          targetId,
      );

  return `${node.name} Condition 평가가 완료되었습니다. 선택된 분기: ${
    targetNames.length >
    0
      ? targetNames.join(
          ", ",
        )
      : "없음"
  }`;
}

function findFinalOutputText(
  workflow: Workflow,
  stepRuns: StepRun[],
): string | undefined {
  const outputNodeIds =
    new Set(
      workflow.nodes
        .filter(
          (node) =>
            node.type ===
            "output",
        )
        .map(
          (node) =>
            node.id,
        ),
    );

  const finalSourceNodeIds =
    workflow.edges
      .filter(
        (edge) =>
          outputNodeIds.has(
            edge.target,
          ),
      )
      .map(
        (edge) =>
          edge.source,
      );

  for (
    const sourceNodeId
    of finalSourceNodeIds
  ) {
    const stepRun =
      stepRuns.find(
        (step) =>
          step.nodeId ===
            sourceNodeId &&
          step.status ===
            "COMPLETED",
      );

    const text =
      getOutputText(
        stepRun?.output,
      );

    if (text) {
      return text;
    }
  }

  for (
    let index =
      stepRuns.length -
      1;
    index >=
    0;
    index -=
      1
  ) {
    const stepRun =
      stepRuns[
        index
      ];

    if (
      !stepRun ||
      stepRun.status !==
        "COMPLETED"
    ) {
      continue;
    }

    const text =
      getOutputText(
        stepRun.output,
      );

    if (text) {
      return text;
    }
  }

  return undefined;
}

function getOutputText(
  output: unknown,
): string | undefined {
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

  const text =
    record.text;

  if (
    typeof text !==
    "string"
  ) {
    return undefined;
  }

  const trimmed =
    text.trim();

  return (
    trimmed ||
    undefined
  );
}

async function ensureMarkdownArtifact(
  runId: string,
  content: string,
) {
  const artifacts =
    await getRunArtifacts(
      runId,
    );

  const reportExists =
    artifacts.some(
      (artifact) =>
        artifact.name ===
          "report.md" &&
        artifact.type ===
          "markdown",
    );

  if (
    reportExists
  ) {
    return;
  }

  await writeMarkdownArtifact(
    runId,
    content,
  );
}