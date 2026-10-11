import {
  prisma,
} from "../../lib/prisma.js";

import type {
  Artifact,
  CreateArtifactInput,
} from "./artifact.types.js";

interface PrismaArtifact {
  id: string;
  runId: string;
  name: string;
  type: string;
  path: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}

function mapArtifact(
  artifact: PrismaArtifact,
): Artifact {
  return {
    id:
      artifact.id,

    runId:
      artifact.runId,

    name:
      artifact.name,

    type:
      artifact.type,

    path:
      artifact.path,

    mimeType:
      artifact.mimeType,

    size:
      artifact.size,

    createdAt:
      artifact.createdAt.toISOString(),
  };
}

export async function findArtifactsByRunId(
  runId: string,
): Promise<Artifact[]> {
  const artifacts =
    await prisma.artifact.findMany({
      where: {
        runId,
      },

      orderBy: {
        createdAt:
          "desc",
      },
    });

  return artifacts.map(
    mapArtifact,
  );
}

export async function findArtifactById(
  artifactId: string,
): Promise<Artifact | null> {
  const artifact =
    await prisma.artifact.findUnique({
      where: {
        id:
          artifactId,
      },
    });

  if (!artifact) {
    return null;
  }

  return mapArtifact(
    artifact,
  );
}

export async function createArtifact(
  input: CreateArtifactInput,
): Promise<Artifact> {
  const artifact =
    await prisma.artifact.create({
      data: {
        id:
          `artifact-${crypto.randomUUID()}`,

        runId:
          input.runId,

        name:
          input.name,

        type:
          input.type,

        path:
          input.path,

        mimeType:
          input.mimeType,

        size:
          input.size,
      },
    });

  return mapArtifact(
    artifact,
  );
}