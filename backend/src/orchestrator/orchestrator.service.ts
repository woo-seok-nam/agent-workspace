import {
  editRun,
  editStepRun,
  getRun,
} from "../modules/runs/run.service.js";

import {
  getWorkflow,
} from "../modules/workflows/workflow.service.js";

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

function createLog(
  message: string,
) {
  return {
    id:
      `log-${crypto.randomUUID()}`,

    timestamp:
      new Date().toISOString(),

    level:
      "info" as const,

    message,
  };
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
      pendingSteps.length === 0
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
      } else {
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
      }

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
              (workflowNode) =>
                workflowNode.id ===
                stepRun.nodeId,
            );

          return (
            node?.config
              ?.requireApproval ===
            true
          );
        },
      );

    if (approvalStep) {
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

    await Promise.all(
      executableSteps.map(
        async (
          stepRun,
        ) => {
          const node =
            workflow.nodes.find(
              (workflowNode) =>
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
                  ),
                ],
              },
            );

            return;
          }

          await executeWorkflowNode(
            runId,
            run,
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

    if (!afterExecution) {
      return;
    }

    const failed =
      afterExecution.stepRuns.some(
        (stepRun) =>
          stepRun.status ===
          "FAILED",
      );

    if (failed) {
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

async function executeWorkflowNode(
  runId: string,
  run: NonNullable<
    Awaited<
      ReturnType<
        typeof getRun
      >
    >
  >,
  workflow: NonNullable<
    Awaited<
      ReturnType<
        typeof getWorkflow
      >
    >
  >,
  node: WorkflowNode,
) {
  const stepRun =
    run.stepRuns.find(
      (step) =>
        step.nodeId ===
        node.id,
    );

  if (!stepRun) {
    return;
  }

  const startedAt =
    new Date().toISOString();

  await editStepRun(
    runId,
    node.id,
    {
      status:
        "RUNNING",

      startedAt,

      logs: [
        ...stepRun.logs,

        createLog(
          `${node.name} 실행을 시작했습니다.`,
        ),
      ],
    },
  );

  try {
    const dependencyOutputs =
      getDependencyOutputs(
        workflow,
        node.id,
        run.stepRuns,
      );

    const result =
      await executeNode({
        workflow,

        run,

        node,

        dependencyOutputs,
      });

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
          ...stepRun.logs,

          createLog(
            `${node.name} 실행을 시작했습니다.`,
          ),

          createLog(
            `${node.name} 실행이 완료되었습니다.`,
          ),
        ],
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Node 실행 중 알 수 없는 오류가 발생했습니다.";

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
            `${node.name} 실행을 시작했습니다.`,
          ),

          {
            id:
              `log-${crypto.randomUUID()}`,

            timestamp:
              new Date().toISOString(),

            level:
              "error",

            message,
          },
        ],
      },
    );
  }
}