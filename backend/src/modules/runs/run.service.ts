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
  WorkflowRunState,
} from "./run.types.js";

const runStateUpdateQueues =
  new Map<
    string,
    Promise<unknown>
  >();

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

    state:
      input.state ??
      {},
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

export async function getRunState(
  runId: string,
): Promise<WorkflowRunState> {
  const run =
    await getRun(
      runId,
    );

  if (!run) {
    throw new Error(
      "Run을 찾을 수 없습니다.",
    );
  }

  return run.state;
}

export async function mergeRunState(
  runId: string,
  patch: WorkflowRunState,
): Promise<WorkflowRunState> {
  const previous =
    runStateUpdateQueues.get(
      runId,
    ) ??
    Promise.resolve();

  const current =
    previous
      .catch(() => undefined)
      .then(
        async () => {
          const run =
            await getRun(
              runId,
            );

          if (!run) {
            throw new Error(
              "Run을 찾을 수 없습니다.",
            );
          }

          const nextState:
            WorkflowRunState =
            {
              ...run.state,
              ...patch,
            };

          const updatedRun =
            await updateRun(
              runId,
              {
                state:
                  nextState,
              },
            );

          if (!updatedRun) {
            throw new Error(
              "Run Shared State를 저장하지 못했습니다.",
            );
          }

          return updatedRun.state;
        },
      );

  runStateUpdateQueues.set(
    runId,
    current,
  );

  try {
    return await current;
  } finally {
    if (
      runStateUpdateQueues.get(
        runId,
      ) ===
      current
    ) {
      runStateUpdateQueues.delete(
        runId,
      );
    }
  }
}

export async function setRunStateValue(
  runId: string,
  key: string,
  value: unknown,
): Promise<WorkflowRunState> {
  const normalizedKey =
    key.trim();

  if (!normalizedKey) {
    throw new Error(
      "Shared State key는 비어 있을 수 없습니다.",
    );
  }

  return mergeRunState(
    runId,
    {
      [normalizedKey]:
        value,
    },
  );
}