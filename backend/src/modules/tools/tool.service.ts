import {
  findAllTools,
  findToolById,
  updateTool,
} from "./tool.repository.js";

import type {
  UpdateToolInput,
} from "./tool.types.js";

export async function getTools() {
  return findAllTools();
}

export async function getTool(
  toolId: string,
) {
  return findToolById(
    toolId,
  );
}

export async function editTool(
  toolId: string,
  input: UpdateToolInput,
) {
  if (
    input.name !== undefined &&
    !input.name.trim()
  ) {
    throw new Error(
      "Tool 이름은 비어 있을 수 없습니다.",
    );
  }

  return updateTool(
    toolId,
    {
      ...input,

      name:
        input.name?.trim(),

      description:
        input.description?.trim(),
    },
  );
}