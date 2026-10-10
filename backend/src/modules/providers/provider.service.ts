import {
  findAllProviders,
  findProviderById,
  updateProvider,
} from "./provider.repository.js";

import type {
  UpdateProviderInput,
} from "./provider.types.js";

export async function getProviders() {
  return findAllProviders();
}

export async function getProvider(
  providerId: string,
) {
  return findProviderById(
    providerId,
  );
}

export async function editProvider(
  providerId: string,
  input: UpdateProviderInput,
) {
  return updateProvider(
    providerId,
    input,
  );
}