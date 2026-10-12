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
  getTools,
} from "../modules/tools/tool.service.js";

import {
  getWorkflow,
} from "../modules/workflows/workflow.service.js";

import type {
  Workflow,
  WorkflowNode,
} from "../modules/workflows/workflow.types.js";

import {
  evaluateExecutionPolicy,
} from "../policy/policy.service.js";

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
 * Supervisor Recovery 실행부.
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

  const nextRecoveryState =
    buildNextRecoveryState(
      latestRun.state,
      nodeId,
      failureMessage,
    );

  const supervisorState =
    buildSupervisorStateValue(
      latestRun.state,
      nextRecoveryState,
    );

  await setRunStateValue(
    run.id,
    "__supervisor",
    supervisorState,
  );

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

/*
 * STEP 49
 *
 * Policy에서 DENY된 Node를 처리한다.
 *
 * 일반적인 Agent 실패와 달리
 * Permission / Capability 위반은 Retry나
 * Supervisor Recovery로 해결되는 문제가 아니다.
 *
 * 따라서 해당 Step과 Run을 즉시 FAILED 처리한다.
 */
async function denyWorkflowNode(
  runId: string,
  node: WorkflowNode,
  reasons: string[],
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

  const stepRun =
    latestRun.stepRuns.find(
      (step) =>
        step.nodeId ===
        node.id,
    );

  if (
    !stepRun ||
    stepRun.status !==
      "PENDING"
  ) {
    return;
  }

  const reasonText =
    reasons.length >
    0
      ? reasons.join(
          " ",
        )
      : "실행 정책에 의해 차단되었습니다.";

  await editStepRun(
    runId,
    node.id,
    {
      status:
        "FAILED",

      completedAt:
        new Date().toISOString(),

      logs: [
        ...stepRun.logs,

        createLog(
          `Policy가 "${node.name}" Step 실행을 차단했습니다.`,
          "error",
        ),

        createLog(
          reasonText,
          "error",
        ),
      ],
    },
  );

  const beforeFailRun =
    await getRun(
      runId,
    );

  if (
    !beforeFailRun ||
    beforeFailRun.status !==
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
}

/*
 * STEP 49
 *
 * Policy Approval을 WAITING_APPROVAL 상태로 전환한다.
 *
 * 기존 requireApproval과 동일한 StepRun 구조를 사용한다.
 * 따라서 기존 승인/거절 API를 그대로 재사용할 수 있다.
 */
async function waitForPolicyApproval(
  runId: string,
  node: WorkflowNode,
  reasons: string[],
  riskLevel: string,
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

  const stepRun =
    latestRun.stepRuns.find(
      (step) =>
        step.nodeId ===
        node.id,
    );

  if (
    !stepRun ||
    stepRun.status !==
      "PENDING"
  ) {
    return;
  }

  const reasonText =
    reasons.length >
    0
      ? reasons.join(
          " ",
        )
      : "사용자 승인이 필요한 작업입니다.";

  await editStepRun(
    runId,
    node.id,
    {
      status:
        "WAITING_APPROVAL",

      approvalStatus:
        "PENDING",

      logs: [
        ...stepRun.logs,

        createLog(
          `Policy 평가 결과 사용자 승인이 필요합니다. 위험도: ${riskLevel}.`,
          "warning",
        ),

        createLog(
          reasonText,
          "warning",
        ),
      ],
    },
  );

  const afterStepUpdate =
    await getRun(
      runId,
    );

  if (
    !afterStepUpdate ||
    afterStepUpdate.status !==
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

    const supervisorDecision =
      superviseRun(
        run,
      );

    switch (
      supervisorDecision.action
    ) {
      case "STOP": {
        return;
      }

      case "WAIT": {
        return;
      }

      case "RECOVER": {
        await recoverFailedStep(
          run,
          supervisorDecision,
        );

        continue;
      }

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
     * STEP 49
     *
     * 실행 가능한 Node가 결정된 뒤
     * 실제 Agent/Tool 실행 전에 Policy를 평가한다.
     */
    const tools =
      await getTools();

    const policyResults =
      executableSteps.map(
        (
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
            return {
              stepRun,

              node:
                undefined,

              policy:
                undefined,
            };
          }

          return {
            stepRun,

            node,

            policy:
              evaluateExecutionPolicy({
                node,

                tools,
              }),
          };
        },
      );

    /*
     * Node 자체가 사라진 비정상 상태부터 처리한다.
     */
    const missingNode =
      policyResults.find(
        (
          result,
        ) =>
          !result.node,
      );

    if (
      missingNode
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

      const latestStep =
        latestRun.stepRuns.find(
          (step) =>
            step.nodeId ===
            missingNode.stepRun.nodeId,
        );

      if (
        latestStep &&
        latestStep.status ===
          "PENDING"
      ) {
        await editStepRun(
          runId,
          latestStep.nodeId,
          {
            status:
              "FAILED",

            completedAt:
              new Date().toISOString(),

            logs: [
              ...latestStep.logs,

              createLog(
                "Workflow Node를 찾지 못했습니다.",
                "error",
              ),
            ],
          },
        );
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
     * DENY는 가장 강한 정책이다.
     *
     * 하나라도 DENY가 있으면
     * 어떤 실행도 시작하기 전에 차단한다.
     */
    const deniedResult =
      policyResults.find(
        (
          result,
        ) =>
          result.node &&
          result.policy
            ?.decision ===
            "DENY",
      );

    if (
      deniedResult?.node &&
      deniedResult.policy
    ) {
      await denyWorkflowNode(
        runId,
        deniedResult.node,
        deniedResult.policy.reasons,
      );

      return;
    }

    /*
     * REQUIRE_APPROVAL이 있는 경우
     * 이미 APPROVED된 Step은 다시 승인받지 않는다.
     *
     * 따라서 기존 approveWorkflowStep()과
     * 동일한 approvalStatus를 재사용한다.
     */
    const approvalResult =
      policyResults.find(
        (
          result,
        ) =>
          result.node &&
          result.policy
            ?.decision ===
            "REQUIRE_APPROVAL" &&
          result.stepRun
            .approvalStatus !==
            "APPROVED",
      );

    if (
      approvalResult?.node &&
      approvalResult.policy
    ) {
      await waitForPolicyApproval(
        runId,
        approvalResult.node,
        approvalResult.policy.reasons,
        approvalResult.policy.riskLevel,
      );

      return;
    }

    /*
     * 여기까지 통과하면:
     *
     * 1. ALLOW Node
     * 2. 이전에 사용자 승인을 받은 REQUIRE_APPROVAL Node
     *
     * 만 남게 된다.
     */
    const executableNodeIds =
      new Set(
        policyResults
          .filter(
            (
              result,
            ) =>
              result.node &&
              result.policy &&
              (
                result.policy
                  .decision ===
                  "ALLOW" ||
                (
                  result.policy
                    .decision ===
                    "REQUIRE_APPROVAL" &&
                  result.stepRun
                    .approvalStatus ===
                    "APPROVED"
                )
              ),
          )
          .map(
            (
              result,
            ) =>
              result.stepRun.nodeId,
          ),
      );

    const approvedExecutableSteps =
      executableSteps.filter(
        (
          stepRun,
        ) =>
          executableNodeIds.has(
            stepRun.nodeId,
          ),
      );

    if (
      approvedExecutableSteps.length ===
      0
    ) {
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

    await Promise.all(
      approvedExecutableSteps.map(
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