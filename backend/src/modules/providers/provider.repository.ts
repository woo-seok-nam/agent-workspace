import {
  prisma,
} from "../../lib/prisma.js";

import type {
  Provider,
  ProviderConnectionStatus,
  ProviderType,
  UpdateProviderInput,
} from "./provider.types.js";

function mapProvider(
  provider: {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    connectionStatus: string;
    createdAt: Date;
    updatedAt: Date;
  },
): Provider {
  return {
    id:
      provider.id as ProviderType,

    name:
      provider.name,

    description:
      provider.description,

    enabled:
      provider.enabled,

    connectionStatus:
      provider.connectionStatus as ProviderConnectionStatus,

    createdAt:
      provider.createdAt.toISOString(),

    updatedAt:
      provider.updatedAt.toISOString(),
  };
}

export async function findAllProviders(): Promise<
  Provider[]
> {
  const providers =
    await prisma.provider.findMany({
      orderBy: {
        createdAt: "asc",
      },
    });

  return providers.map(
    mapProvider,
  );
}

export async function findProviderById(
  providerId: string,
): Promise<
  Provider | undefined
> {
  const provider =
    await prisma.provider.findUnique({
      where: {
        id: providerId,
      },
    });

  return provider
    ? mapProvider(
        provider,
      )
    : undefined;
}

export async function updateProvider(
  providerId: string,
  input: UpdateProviderInput,
): Promise<
  Provider | undefined
> {
  const existing =
    await prisma.provider.findUnique({
      where: {
        id: providerId,
      },
    });

  if (!existing) {
    return undefined;
  }

  const provider =
    await prisma.provider.update({
      where: {
        id: providerId,
      },

      data: {
        enabled:
          input.enabled,

        connectionStatus:
          input.connectionStatus,
      },
    });

  return mapProvider(
    provider,
  );
}