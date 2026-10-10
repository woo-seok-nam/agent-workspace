import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  addWorkflow,
  editWorkflow,
  getWorkflow,
  getWorkflows,
  removeWorkflow,
} from "./workflow.service.js";

import type {
  CreateWorkflowInput,
  UpdateWorkflowInput,
} from "./workflow.types.js";

function getParamValue(
  value:
    | string
    | string[]
    | undefined,
): string | undefined {
  if (
    Array.isArray(value)
  ) {
    return value[0];
  }

  return value;
}

export async function listWorkflows(
  _request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const workflows =
      await getWorkflows();

    response.status(200).json({
      data:
        workflows,
    });
  } catch (error) {
    next(error);
  }
}

export async function readWorkflow(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const workflowId =
      getParamValue(
        request.params.workflowId,
      );

    if (!workflowId) {
      response.status(400).json({
        error: {
          code:
            "INVALID_WORKFLOW_ID",

          message:
            "Workflow ID가 필요합니다.",
        },
      });

      return;
    }

    const workflow =
      await getWorkflow(
        workflowId,
      );

    if (!workflow) {
      response.status(404).json({
        error: {
          code:
            "WORKFLOW_NOT_FOUND",

          message:
            "Workflow를 찾을 수 없습니다.",
        },
      });

      return;
    }

    response.status(200).json({
      data:
        workflow,
    });
  } catch (error) {
    next(error);
  }
}

export async function createWorkflowController(
  request: Request<
    Record<string, never>,
    unknown,
    CreateWorkflowInput
  >,
  response: Response,
  next: NextFunction,
) {
  try {
    const workflow =
      await addWorkflow(
        request.body,
      );

    response.status(201).json({
      data:
        workflow,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateWorkflowController(
  request: Request<
    {
      workflowId: string;
    },
    unknown,
    UpdateWorkflowInput
  >,
  response: Response,
  next: NextFunction,
) {
  try {
    const workflowId =
      getParamValue(
        request.params.workflowId,
      );

    if (!workflowId) {
      response.status(400).json({
        error: {
          code:
            "INVALID_WORKFLOW_ID",

          message:
            "Workflow ID가 필요합니다.",
        },
      });

      return;
    }

    const workflow =
      await editWorkflow(
        workflowId,
        request.body,
      );

    if (!workflow) {
      response.status(404).json({
        error: {
          code:
            "WORKFLOW_NOT_FOUND",

          message:
            "Workflow를 찾을 수 없습니다.",
        },
      });

      return;
    }

    response.status(200).json({
      data:
        workflow,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteWorkflowController(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const workflowId =
      getParamValue(
        request.params.workflowId,
      );

    if (!workflowId) {
      response.status(400).json({
        error: {
          code:
            "INVALID_WORKFLOW_ID",

          message:
            "Workflow ID가 필요합니다.",
        },
      });

      return;
    }

    const deleted =
      await removeWorkflow(
        workflowId,
      );

    if (!deleted) {
      response.status(404).json({
        error: {
          code:
            "WORKFLOW_NOT_FOUND",

          message:
            "Workflow를 찾을 수 없습니다.",
        },
      });

      return;
    }

    response
      .status(204)
      .send();
  } catch (error) {
    next(error);
  }
}