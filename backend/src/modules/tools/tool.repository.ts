import {
  prisma,
} from "../../lib/prisma.js";

import type {
  Tool,
  ToolType,
  UpdateToolInput,
} from "./tool.types.js";

function mapTool(
  tool: {
    id: string;
    name: string;
    description: string | null;
    type: string;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
  },
): Tool {
  return {
    id: tool.id,

    name: tool.name,

    description:
      tool.description ??
      undefined,

    type:
      tool.type as ToolType,

    enabled:
      tool.enabled,

    createdAt:
      tool.createdAt.toISOString(),

    updatedAt:
      tool.updatedAt.toISOString(),
  };
}

export async function findAllTools(): Promise<
  Tool[]
> {
  const tools =
    await prisma.tool.findMany({
      orderBy: {
        createdAt: "asc",
      },
    });

  return tools.map(
    mapTool,
  );
}

export async function findToolById(
  toolId: string,
): Promise<
  Tool | undefined
> {
  const tool =
    await prisma.tool.findUnique({
      where: {
        id: toolId,
      },
    });

  return tool
    ? mapTool(tool)
    : undefined;
}

export async function updateTool(
  toolId: string,
  input: UpdateToolInput,
): Promise<
  Tool | undefined
> {
  const existing =
    await prisma.tool.findUnique({
      where: {
        id: toolId,
      },
    });

  if (!existing) {
    return undefined;
  }

  const tool =
    await prisma.tool.update({
      where: {
        id: toolId,
      },

      data: {
        name:
          input.name,

        description:
          input.description,

        enabled:
          input.enabled,
      },
    });

  return mapTool(
    tool,
  );
}