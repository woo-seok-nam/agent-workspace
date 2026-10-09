import {
  prisma,
} from "../../lib/prisma.js";

import type {
  Agent,
  CreateAgentInput,
  UpdateAgentInput,
} from "./agent.types.js";

function mapAgent(
  agent: {
    id: string;
    name: string;
    description: string | null;
    modelId: string;
    toolIds: string;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
  },
): Agent {
  let parsedToolIds: string[] = [];

  try {
    const parsed =
      JSON.parse(
        agent.toolIds,
      );

    if (
      Array.isArray(parsed)
    ) {
      parsedToolIds =
        parsed.filter(
          (
            value,
          ): value is string =>
            typeof value === "string",
        );
    }
  } catch {
    parsedToolIds = [];
  }

  return {
    id:
      agent.id,

    name:
      agent.name,

    description:
      agent.description ??
      undefined,

    modelId:
      agent.modelId,

    toolIds:
      parsedToolIds,

    enabled:
      agent.enabled,

    createdAt:
      agent.createdAt.toISOString(),

    updatedAt:
      agent.updatedAt.toISOString(),
  };
}

export async function findAllAgents(): Promise<
  Agent[]
> {
  const agents =
    await prisma.agent.findMany({
      orderBy: {
        createdAt: "asc",
      },
    });

  return agents.map(
    mapAgent,
  );
}

export async function findAgentById(
  agentId: string,
): Promise<
  Agent | undefined
> {
  const agent =
    await prisma.agent.findUnique({
      where: {
        id: agentId,
      },
    });

  return agent
    ? mapAgent(agent)
    : undefined;
}

export async function createAgent(
  input: CreateAgentInput,
): Promise<Agent> {
  const agent =
    await prisma.agent.create({
      data: {
        id:
          `agent-${crypto.randomUUID()}`,

        name:
          input.name,

        description:
          input.description,

        modelId:
          input.modelId,

        toolIds:
          JSON.stringify(
            input.toolIds ??
              [],
          ),

        enabled:
          input.enabled ??
          true,
      },
    });

  return mapAgent(
    agent,
  );
}

export async function updateAgent(
  agentId: string,
  input: UpdateAgentInput,
): Promise<
  Agent | undefined
> {
  const existing =
    await prisma.agent.findUnique({
      where: {
        id: agentId,
      },
    });

  if (!existing) {
    return undefined;
  }

  const agent =
    await prisma.agent.update({
      where: {
        id: agentId,
      },

      data: {
        name:
          input.name,

        description:
          input.description,

        modelId:
          input.modelId,

        toolIds:
          input.toolIds !==
          undefined
            ? JSON.stringify(
                input.toolIds,
              )
            : undefined,

        enabled:
          input.enabled,
      },
    });

  return mapAgent(
    agent,
  );
}

export async function deleteAgent(
  agentId: string,
): Promise<boolean> {
  const existing =
    await prisma.agent.findUnique({
      where: {
        id: agentId,
      },
    });

  if (!existing) {
    return false;
  }

  await prisma.agent.delete({
    where: {
      id: agentId,
    },
  });

  return true;
}