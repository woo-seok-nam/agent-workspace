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
  buildNextRecoveryState,
  buildSupervisorStateValue,
} from "../supervisor/recovery.service.js";

import {
  superviseRun,
} from "../supervisor/supervisor.service.js";

import type {
  SupervisorDecision,
} from "../supervisor/supervisor.types.js";

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

function getLastStepErrorMessage(
  stepRun: StepRun,
) {
  for (
    let index =
      stepRun.logs.length -
      1;
    index >=
    0;
    index -=
      1
  ) {
    const log =
      stepRun.logs[
        index
      ];

    if (
      !log ||
      log.level !==
        "error"
    ) {
      continue;
    }

    return log.message;
  }

  return undefined;
}

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

      startedAt:
        null,

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

/*
 * STEP 47
 *
 * Supervisor가 RECOVER 결정을 내린 경우
 * 실패한 Step을 다시 실행 가능한 상태로 되돌린다.
 *
 * 중요한 순서:
 *
 * 1. Recovery 횟수를 Durable Shared State에 먼저 저장
 * 2. FAILED Step을 PENDING으로 되돌림
 * 3. Orchestrator loop가 DAG를 다시 평가
 *
 * Recovery 횟수를 먼저 저장하는 이유는
 * Step Reset 뒤 서버가 죽더라도 Recovery 횟수가
 * 사라져 무한 Recovery가 발생하지 않도록 하기 위해서다.
 */
async function recoverFailedStep(
  run: WorkflowRun,
  decision: SupervisorDecision,
) {
  const nodeId =
    decision.recoveryNodeId;

  if (!nodeId) {
    throw new Error(
      "Supervisor Recovery 대상 Node ID가 없습니다.",
    );
  }

  const failedStep =
    run.stepRuns.find(
      (stepRun) =>
        stepRun.nodeId ===
        nodeId,
    );

  if (!failedStep) {
    throw new Error(
      `Recovery 대상 Step을 찾을 수 없습니다: ${nodeId}`,
    );
  }

  if (
    failedStep.status !==
    "FAILED"
  ) {
    return;
  }

  /*
   * Recovery 직전 최신 Run을 다시 읽는다.
   *
   * Pause / Cancel 같은 사용자 제어가
   * 중간에 들어왔을 수 있기 때문이다.
   */
  const latestRun =
    await getRun(
      run.id,
    );

  if (
    !latestRun ||
    latestRun.status !==
      "RUNNING"
  ) {
    return;
  }

  const latestFailedStep =
    latestRun.stepRuns.find(
      (stepRun) =>
        stepRun.nodeId ===
        nodeId,
    );

  if (
    !latestFailedStep ||
    latestFailedStep.status !==
      "FAILED"
  ) {
    return;
  }

  const failureMessage =
    getLastStepErrorMessage(
      latestFailedStep,
    );

  /*
   * 현재 Shared State를 기준으로
   * Supervisor Recovery 횟수를 +1 한다.
   */
  const nextRecoveryState =
    buildNextRecoveryState(
      latestRun.state,
      nodeId,
      failureMessage,
    );

  /*
   * 기존 __supervisor metadata가 있을 수 있으므로
   * recovery 부분만 안전하게 갱신한 값을 만든다.
   */
  const supervisorState =
    buildSupervisorStateValue(
      latestRun.state,
      nextRecoveryState,
    );

  /*
   * STEP 43에서 만든 Durable Shared State API를 사용한다.
   *
   * 최종 DB 구조:
   *
   * {
   *   "...node output...": {...},
   *   "__supervisor": {
   *     "recovery": {
   *       "steps": {
   *         "node-id": {
   *           "attempts": 1,
   *           ...
   *         }
   *       }
   *     }
   *   }
   * }
   */
  await setRunStateValue(
    run.id,
    "__supervisor",
    supervisorState,
  );

  /*
   * Recovery State 저장 중 Pause/Cancel이
   * 발생했는지 다시 확인한다.
   */
  const beforeReset =
    await getRun(
      run.id,
    );

  if (
    !beforeReset ||
    beforeReset.status !==
      "RUNNING"
  ) {
    return;
  }

  const stepBeforeReset =
    beforeReset.stepRuns.find(
      (stepRun) =>
        stepRun.nodeId ===
        nodeId,
    );

  if (
    !stepBeforeReset ||
    stepBeforeReset.status !==
      "FAILED"
  ) {
    return;
  }

  const attempt =
    decision.recoveryAttempt ??
    nextRecoveryState.steps[
      nodeId
    ]?.attempts ??
    1;

  const maxAttempts =
    decision.recoveryMaxAttempts ??
    0;

  /*
   * 실패 실행에서 생성된 output / token / cost는
   * 다음 Recovery 실행의 결과로 간주하면 안 되므로
   * 초기화한다.
   *
   * 기존 로그는 보존하여
   * 왜 Recovery가 발생했는지 추적할 수 있게 한다.
   */
  await editStepRun(
    run.id,
    nodeId,
    {
      status:
        "PENDING",

      input:
        null,

      output:
        null,

      tokenUsage:
        0,

      cost:
        0,

      startedAt:
        null,

      completedAt:
        null,

      logs: [
        ...stepBeforeReset.logs,

        createLog(
          `Supervisor가 실패한 Step을 복구합니다. Recovery ${attempt}/${maxAttempts}.`,
          "warning",
        ),
      ],
    },
  );
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
     * Supervisor가 현재 Workflow Run 전체를 평가한다.
     */
    const supervisorDecision =
      superviseRun(
        run,
      );

    switch (
      supervisorDecision.action
    ) {
      /*
       * 이미 완료 / 실패 / 취소된 Run.
       */
      case "STOP": {
        return;
      }

      /*
       * Pause / Approval / 실행 중 Step.
       */
      case "WAIT": {
        return;
      }

      /*
       * STEP 47
       *
       * 실패한 Step을 Workflow 수준에서
       * Recovery한 뒤 loop 처음으로 돌아간다.
       *
       * 다음 loop에서는 Supervisor가
       * PENDING Step을 보고 CONTINUE를 반환하고,
       * DAG Engine이 다시 실행 가능 Node를 계산한다.
       */
      case "RECOVER": {
        await recoverFailedStep(
          run,
          supervisorDecision,
        );

        continue;
      }

      /*
       * Recovery 가능 횟수를 모두 사용한 실패.
       */
      case "FAIL": {
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

      /*
       * 모든 Step이 종료됨.
       */
      case "COMPLETE": {
        const workflow =
          await getWorkflow(
            run.workflowId,
          );

        if (!workflow) {
          throw new Error(
            "Workflow를 찾을 수 없습니다.",
          );
        }

        await completeWorkflowRun(
          run,
          workflow,
        );

        return;
      }

      /*
       * 실행 가능한 PENDING Step이 존재한다.
       */
      case "CONTINUE": {
        break;
      }
    }

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
      continue;
    }

    /*
     * Condition 분기 때문에 더 이상
     * 도달할 수 없는 Step을 SKIPPED 처리한다.
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

            const latestStep =
              latestRun.stepRuns.find(
                (step) =>
                  step.nodeId ===
                  stepRun.nodeId,
              );

            if (
              !latestStep ||
              latestStep.status !==
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

            await editStepRun(
              runId,
              stepRun.nodeId,
              {
                status:
                  "SKIPPED",

                completedAt:
                  new Date().toISOString(),

                logs: [
                  ...latestStep.logs,

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

    /*
     * DAG 기준으로 현재 실행 가능한 Node 계산.
     */
    const executableSteps =
      pendingSteps.filter(
        (stepRun) =>
          canExecuteNode(
            workflow,
            stepRun.nodeId,
            run.stepRuns,
          ),
      );

    /*
     * PENDING은 존재하는데 실행 가능한 Step이 없다.
     *
     * 최신 상태를 다시 Supervisor에게 확인한 뒤
     * 여전히 CONTINUE라면 DAG Deadlock으로 판단한다.
     */
    if (
      executableSteps.length ===
      0
    ) {
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

      const latestDecision =
        superviseRun(
          latestRun,
        );

      if (
        latestDecision.action !==
        "CONTINUE"
      ) {
        continue;
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

    /*
     * Human Approval이 필요한 실행 가능 Step 확인.
     */
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

    /*
     * 동일 DAG Level의 Node는 병렬 실행한다.
     */
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

    /*
     * 직접 실패/완료 판단하지 않고
     * loop 처음으로 돌아가 Supervisor에게
     * 최신 상태를 다시 평가받는다.
     */
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

async function completeWorkflowRun(
  run: WorkflowRun,
  workflow: Workflow,
) {
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
      run.id,
      finalText,
    );
  }

  const latestRun =
    await getRun(
      run.id,
    );

  if (
    !latestRun ||
    latestRun.status !==
      "RUNNING"
  ) {
    return;
  }

  const finalDecision =
    superviseRun(
      latestRun,
    );

  if (
    finalDecision.action !==
    "COMPLETE"
  ) {
    return;
  }

  await editRun(
    run.id,
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
}

async function executeWorkflowNode(
  runId: string,
  workflow: Workflow,
  node: WorkflowNode,
) {
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

      if (
        !afterProviderStep ||
        afterProviderStep.status !==
          "RUNNING"
      ) {
        return;
      }

      await setRunStateValue(
        runId,
        node.id,
        result.output,
      );

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

      /*
       * Node 내부 Retry.
       *
       * Supervisor Recovery와 별개의 레이어다.
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
       * Node 자체의 Retry가 끝났다면 FAILED 처리한다.
       *
       * 여기서 Run 전체를 FAILED로 만들지 않는다.
       *
       * 다음 Orchestrator loop에서 Supervisor가
       * 이 FAILED Step을 보고 Recovery 여부를 판단한다.
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