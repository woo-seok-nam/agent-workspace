import {
  prisma,
} from "../../lib/prisma.js";

import type {
  ApprovalStatus,
  CreateWorkflowRunInput,
  ExecutionLog,
  StepRun,
  StepRunStatus,
  UpdateStepRunInput,
  UpdateWorkflowRunInput,
  WorkflowRun,
  WorkflowRunStatus,
} from "./run.types.js";

function parseJson(
  value: string | null,
): unknown {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(
      value,
    );
  } catch {
    return undefined;
  }
}

function parseLogs(
  value: string,
): ExecutionLog[] {
  try {
    const parsed =
      JSON.parse(
        value,
      );

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as ExecutionLog[];
  } catch {
    return [];
  }
}

function mapStepRun(
  stepRun: {
    id: string;
    runId: string;
    nodeId: string;
    status: string;
    approvalStatus: string | null;
    input: string | null;
    output: string | null;
    logs: string;
    tokenUsage: number;
    cost: number;
    startedAt: Date | null;
    completedAt: Date | null;
  },
): StepRun {
  return {
    id:
      stepRun.id,

    runId:
      stepRun.runId,

    nodeId:
      stepRun.nodeId,

    status:
      stepRun.status as StepRunStatus,

    approvalStatus:
      stepRun.approvalStatus
        ? stepRun.approvalStatus as ApprovalStatus
        : undefined,

    startedAt:
      stepRun.startedAt?.toISOString(),

    completedAt:
      stepRun.completedAt?.toISOString(),

    input:
      parseJson(
        stepRun.input,
      ),

    output:
      parseJson(
        stepRun.output,
      ),

    tokenUsage:
      stepRun.tokenUsage,

    cost:
      stepRun.cost,

    logs:
      parseLogs(
        stepRun.logs,
      ),
  };
}

function mapRun(
  run: {
    id: string;
    workflowId: string;
    name: string;
    prompt: string | null;
    status: string;
    tokenUsage: number;
    cost: number;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;

    stepRuns: Array<{
      id: string;
      runId: string;
      nodeId: string;
      status: string;
      approvalStatus: string | null;
      input: string | null;
      output: string | null;
      logs: string;
      tokenUsage: number;
      cost: number;
      startedAt: Date | null;
      completedAt: Date | null;
    }>;
  },
): WorkflowRun {
  return {
    id:
      run.id,

    workflowId:
      run.workflowId,

    name:
      run.name,

    prompt:
      run.prompt ??
      undefined,

    status:
      run.status as WorkflowRunStatus,

    startedAt:
      run.startedAt?.toISOString(),

    completedAt:
      run.completedAt?.toISOString(),

    stepRuns:
      run.stepRuns.map(
        mapStepRun,
      ),

    tokenUsage:
      run.tokenUsage,

    cost:
      run.cost,

    createdAt:
      run.createdAt.toISOString(),

    updatedAt:
      run.updatedAt.toISOString(),
  };
}

export async function findAllRuns(): Promise<
  WorkflowRun[]
> {
  const runs =
    await prisma.workflowRun.findMany({
      include: {
        stepRuns: {
          orderBy: {
            createdAt:
              "asc",
          },
        },
      },

      orderBy: {
        createdAt:
          "desc",
      },
    });

  return runs.map(
    mapRun,
  );
}

export async function findRunById(
  runId: string,
): Promise<
  WorkflowRun | undefined
> {
  const run =
    await prisma.workflowRun.findUnique({
      where: {
        id: runId,
      },

      include: {
        stepRuns: {
          orderBy: {
            createdAt:
              "asc",
          },
        },
      },
    });

  return run
    ? mapRun(run)
    : undefined;
}

export async function createRun(
  input: CreateWorkflowRunInput,
): Promise<WorkflowRun> {
  const workflow =
    await prisma.workflow.findUnique({
      where: {
        id:
          input.workflowId,
      },

      include: {
        nodes: true,
      },
    });

  if (!workflow) {
    throw new Error(
      "Workflow를 찾을 수 없습니다.",
    );
  }

  const runId =
    `run-${crypto.randomUUID()}`;

  const executableNodes =
    workflow.nodes.filter(
      (node) =>
        node.type !==
          "input" &&
        node.type !==
          "output",
    );

  await prisma.workflowRun.create({
    data: {
      id:
        runId,

      workflowId:
        workflow.id,

      name:
        input.name?.trim() ||
        `${workflow.name} Run`,

      prompt:
        input.prompt?.trim(),

      status:
        "QUEUED",

      stepRuns: {
        create:
          executableNodes.map(
            (node) => ({
              id:
                `step-${crypto.randomUUID()}`,

              nodeId:
                node.nodeId,

              status:
                "PENDING",

              approvalStatus:
                null,

              logs:
                "[]",

              tokenUsage:
                0,

              cost:
                0,
            }),
          ),
      },
    },
  });

  const created =
    await findRunById(
      runId,
    );

  if (!created) {
    throw new Error(
      "생성된 Run을 불러오지 못했습니다.",
    );
  }

  return created;
}

export async function updateRun(
  runId: string,
  input: UpdateWorkflowRunInput,
): Promise<
  WorkflowRun | undefined
> {
  const existing =
    await prisma.workflowRun.findUnique({
      where: {
        id: runId,
      },
    });

  if (!existing) {
    return undefined;
  }

  await prisma.workflowRun.update({
    where: {
      id: runId,
    },

    data: {
      status:
        input.status,

      startedAt:
        input.startedAt ===
        undefined
          ? undefined
          : input.startedAt ===
              null
            ? null
            : new Date(
                input.startedAt,
              ),

      completedAt:
        input.completedAt ===
        undefined
          ? undefined
          : input.completedAt ===
              null
            ? null
            : new Date(
                input.completedAt,
              ),

      tokenUsage:
        input.tokenUsage,

      cost:
        input.cost,
    },
  });

  return findRunById(
    runId,
  );
}

export async function updateStepRun(
  runId: string,
  nodeId: string,
  input: UpdateStepRunInput,
): Promise<
  StepRun | undefined
> {
  const existing =
    await prisma.stepRun.findUnique({
      where: {
        runId_nodeId: {
          runId,
          nodeId,
        },
      },
    });

  if (!existing) {
    return undefined;
  }

  const updated =
    await prisma.stepRun.update({
      where: {
        runId_nodeId: {
          runId,
          nodeId,
        },
      },

      data: {
        status:
          input.status,

        approvalStatus:
          input.approvalStatus,

        input:
          input.input === undefined
            ? undefined
            : JSON.stringify(
                input.input,
              ),

        output:
          input.output === undefined
            ? undefined
            : JSON.stringify(
                input.output,
              ),

        logs:
          input.logs === undefined
            ? undefined
            : JSON.stringify(
                input.logs,
              ),

        tokenUsage:
          input.tokenUsage,

        cost:
          input.cost,

        startedAt:
          input.startedAt ===
          undefined
            ? undefined
            : input.startedAt ===
                null
              ? null
              : new Date(
                  input.startedAt,
                ),

        completedAt:
          input.completedAt ===
          undefined
            ? undefined
            : input.completedAt ===
                null
              ? null
              : new Date(
                  input.completedAt,
                ),
      },
    });

  return mapStepRun(
    updated,
  );
}