import {
  createArtifact,
  findArtifactsByRunId,
} from "./artifact.repository.js";

import type {
  CreateArtifactInput,
} from "./artifact.types.js";

export async function getRunArtifacts(
  runId: string,
) {
  return findArtifactsByRunId(
    runId,
  );
}

export async function addArtifact(
  input: CreateArtifactInput,
) {
  return createArtifact(
    input,
  );
}