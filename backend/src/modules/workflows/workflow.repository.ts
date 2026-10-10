import {
  prisma,
} from "../../lib/prisma.js";

import type {
  CreateWorkflowInput,
  UpdateWorkflowInput,
  Workflow,
  WorkflowCondition,
  WorkflowNodeConfig,
  WorkflowNodeType,
} from "./workflow.types.js";

type WorkflowWithRelations =
  Awaited<
    ReturnType<
      typeof prisma.workflow.findFirst
    >
  >;

function parseStringArray(
  value: string,
): string[] {
  try {
    const parsed =
      JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (
        item,
      ): item is string =>
        typeof item === "string",
    );
  } catch {
    return [];
  }
}

function parseConfig(
  value: string,
): WorkflowNodeConfig {
  try {
    return JSON.parse(
      value,
    ) as WorkflowNodeConfig;
  } catch {
    return {};
  }
}

function parseCondition(
  value: string | null,
): WorkflowCondition | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(
      value,
    ) as WorkflowCondition;
  } catch {
    return undefined;
  }
}

function mapWorkflow(
  workflow: {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;

    nodes: Array<{
      nodeId: string;
      type: string;
      name: string;
      description: string | null;
      positionX: number;
      positionY: number;
      agentId: string | null;
      modelId: string | null;
      toolIds: string;
      config: string;
    }>;

    edges: Array<{
      edgeId: string;
      source: string;
      target: string;
      sourceHandle: string | null;
      targetHandle: string | null;
      condition: string | null;
    }>;
  },
): Workflow {
  return {
    id:
      workflow.id,

    name:
      workflow.name,

    description:
      workflow.description ??
      undefined,

    nodes:
      workflow.nodes.map(
        (node) => ({
          id:
            node.nodeId,

          type:
            node.type as WorkflowNodeType,

          name:
            node.name,

          description:
            node.description ??
            undefined,

          position: {
            x:
              node.positionX,

            y:
              node.positionY,
          },

          agentId:
            node.agentId ??
            undefined,

          modelId:
            node.modelId ??
            undefined,

          toolIds:
            parseStringArray(
              node.toolIds,
            ),

          config:
            parseConfig(
              node.config,
            ),
        }),
      ),

    edges:
      workflow.edges.map(
        (edge) => ({
          id:
            edge.edgeId,

          source:
            edge.source,

          target:
            edge.target,

          sourceHandle:
            edge.sourceHandle ??
            undefined,

          targetHandle:
            edge.targetHandle ??
            undefined,

          condition:
            parseCondition(
              edge.condition,
            ),
        }),
      ),

    createdAt:
      workflow.createdAt.toISOString(),

    updatedAt:
      workflow.updatedAt.toISOString(),
  };
}

export async function findAllWorkflows(): Promise<
  Workflow[]
> {
  const workflows =
    await prisma.workflow.findMany({
      include: {
        nodes: true,
        edges: true,
      },

      orderBy: {
        createdAt: "asc",
      },
    });

  return workflows.map(
    mapWorkflow,
  );
}

export async function findWorkflowById(
  workflowId: string,
): Promise<
  Workflow | undefined
> {
  const workflow =
    await prisma.workflow.findUnique({
      where: {
        id: workflowId,
      },

      include: {
        nodes: true,
        edges: true,
      },
    });

  return workflow
    ? mapWorkflow(
        workflow,
      )
    : undefined;
}

export async function createWorkflow(
  input: CreateWorkflowInput,
): Promise<Workflow> {
  const workflowId =
    `workflow-${crypto.randomUUID()}`;

  await prisma.workflow.create({
    data: {
      id:
        workflowId,

      name:
        input.name,

      description:
        input.description,

      nodes: {
        create:
          (input.nodes ?? []).map(
            (node) => ({
              nodeId:
                node.id,

              type:
                node.type,

              name:
                node.name,

              description:
                node.description,

              positionX:
                node.position.x,

              positionY:
                node.position.y,

              agentId:
                node.agentId,

              modelId:
                node.modelId,

              toolIds:
                JSON.stringify(
                  node.toolIds ??
                    [],
                ),

              config:
                JSON.stringify(
                  node.config ??
                    {},
                ),
            }),
          ),
      },

      edges: {
        create:
          (input.edges ?? []).map(
            (edge) => ({
              edgeId:
                edge.id,

              source:
                edge.source,

              target:
                edge.target,

              sourceHandle:
                edge.sourceHandle,

              targetHandle:
                edge.targetHandle,

              condition:
                edge.condition
                  ? JSON.stringify(
                      edge.condition,
                    )
                  : null,
            }),
          ),
      },
    },
  });

  const created =
    await findWorkflowById(
      workflowId,
    );

  if (!created) {
    throw new Error(
      "생성된 Workflow를 불러오지 못했습니다.",
    );
  }

  return created;
}

export async function updateWorkflow(
  workflowId: string,
  input: UpdateWorkflowInput,
): Promise<
  Workflow | undefined
> {
  const existing =
    await prisma.workflow.findUnique({
      where: {
        id: workflowId,
      },
    });

  if (!existing) {
    return undefined;
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.workflow.update({
        where: {
          id: workflowId,
        },

        data: {
          name:
            input.name,

          description:
            input.description,
        },
      });

      if (input.nodes !== undefined) {
        await tx.workflowNode.deleteMany({
          where: {
            workflowId,
          },
        });

        if (
          input.nodes.length >
          0
        ) {
          await tx.workflowNode.createMany({
            data:
              input.nodes.map(
                (node) => ({
                  workflowId,

                  nodeId:
                    node.id,

                  type:
                    node.type,

                  name:
                    node.name,

                  description:
                    node.description,

                  positionX:
                    node.position.x,

                  positionY:
                    node.position.y,

                  agentId:
                    node.agentId,

                  modelId:
                    node.modelId,

                  toolIds:
                    JSON.stringify(
                      node.toolIds ??
                        [],
                    ),

                  config:
                    JSON.stringify(
                      node.config ??
                        {},
                    ),
                }),
              ),
          });
        }
      }

      if (input.edges !== undefined) {
        await tx.workflowEdge.deleteMany({
          where: {
            workflowId,
          },
        });

        if (
          input.edges.length >
          0
        ) {
          await tx.workflowEdge.createMany({
            data:
              input.edges.map(
                (edge) => ({
                  workflowId,

                  edgeId:
                    edge.id,

                  source:
                    edge.source,

                  target:
                    edge.target,

                  sourceHandle:
                    edge.sourceHandle,

                  targetHandle:
                    edge.targetHandle,

                  condition:
                    edge.condition
                      ? JSON.stringify(
                          edge.condition,
                        )
                      : null,
                }),
              ),
          });
        }
      }
    },
  );

  return findWorkflowById(
    workflowId,
  );
}

export async function deleteWorkflow(
  workflowId: string,
): Promise<boolean> {
  const existing =
    await prisma.workflow.findUnique({
      where: {
        id: workflowId,
      },
    });

  if (!existing) {
    return false;
  }

  await prisma.workflow.delete({
    where: {
      id: workflowId,
    },
  });

  return true;
}