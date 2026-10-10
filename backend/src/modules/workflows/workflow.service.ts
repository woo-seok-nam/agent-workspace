import {
  createWorkflow,
  deleteWorkflow,
  findAllWorkflows,
  findWorkflowById,
  updateWorkflow,
} from "./workflow.repository.js";

import type {
  CreateWorkflowInput,
  UpdateWorkflowInput,
} from "./workflow.types.js";

export async function getWorkflows() {
  return findAllWorkflows();
}

export async function getWorkflow(
  workflowId: string,
) {
  return findWorkflowById(
    workflowId,
  );
}

export async function addWorkflow(
  input: CreateWorkflowInput,
) {
  if (
    !input.name?.trim()
  ) {
    throw new Error(
      "Workflow 이름은 필수입니다.",
    );
  }

  return createWorkflow({
    ...input,

    name:
      input.name.trim(),

    description:
      input.description?.trim(),
  });
}

export async function editWorkflow(
  workflowId: string,
  input: UpdateWorkflowInput,
) {
  if (
    input.name !== undefined &&
    !input.name.trim()
  ) {
    throw new Error(
      "Workflow 이름은 비어 있을 수 없습니다.",
    );
  }

  return updateWorkflow(
    workflowId,
    {
      ...input,

      name:
        input.name?.trim(),

      description:
        input.description?.trim(),
    },
  );
}

export async function removeWorkflow(
  workflowId: string,
) {
  return deleteWorkflow(
    workflowId,
  );
}