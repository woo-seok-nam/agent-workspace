import {
  createRun,
  findAllRuns,
  findRunById,
  updateRun,
  updateStepRun,
} from "./run.repository.js";

import type {
  CreateWorkflowRunInput,
  UpdateStepRunInput,
  UpdateWorkflowRunInput,
} from "./run.types.js";

export async function getRuns() {
  return findAllRuns();
}

export async function getRun(
  runId: string,
) {
  return findRunById(
    runId,
  );
}

export async function addRun(
  input: CreateWorkflowRunInput,
) {
  if (
    !input.workflowId?.trim()
  ) {
    throw new Error(
      "workflowId는 필수입니다.",
    );
  }

  return createRun({
    ...input,

    workflowId:
      input.workflowId.trim(),

    name:
      input.name?.trim(),

    prompt:
      input.prompt?.trim(),
  });
}

export async function editRun(
  runId: string,
  input: UpdateWorkflowRunInput,
) {
  return updateRun(
    runId,
    input,
  );
}

export async function editStepRun(
  runId: string,
  nodeId: string,
  input: UpdateStepRunInput,
) {
  return updateStepRun(
    runId,
    nodeId,
    input,
  );
}