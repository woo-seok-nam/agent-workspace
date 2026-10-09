import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  addAgent,
  editAgent,
  getAgent,
  getAgents,
  removeAgent,
} from "./agent.service.js";

import type {
  CreateAgentInput,
  UpdateAgentInput,
} from "./agent.types.js";

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

export async function listAgents(
  _request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const agents =
      await getAgents();

    response.status(200).json({
      data: agents,
    });
  } catch (error) {
    next(error);
  }
}

export async function readAgent(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const agentId =
      getParamValue(
        request.params.agentId,
      );

    if (!agentId) {
      response.status(400).json({
        error: {
          code:
            "INVALID_AGENT_ID",

          message:
            "Agent ID가 필요합니다.",
        },
      });

      return;
    }

    const agent =
      await getAgent(
        agentId,
      );

    if (!agent) {
      response.status(404).json({
        error: {
          code:
            "AGENT_NOT_FOUND",

          message:
            "Agent를 찾을 수 없습니다.",
        },
      });

      return;
    }

    response.status(200).json({
      data: agent,
    });
  } catch (error) {
    next(error);
  }
}

export async function createAgentController(
  request: Request<
    Record<string, never>,
    unknown,
    CreateAgentInput
  >,
  response: Response,
  next: NextFunction,
) {
  try {
    const agent =
      await addAgent(
        request.body,
      );

    response.status(201).json({
      data: agent,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAgentController(
  request: Request<
    {
      agentId: string;
    },
    unknown,
    UpdateAgentInput
  >,
  response: Response,
  next: NextFunction,
) {
  try {
    const agentId =
      getParamValue(
        request.params.agentId,
      );

    if (!agentId) {
      response.status(400).json({
        error: {
          code:
            "INVALID_AGENT_ID",

          message:
            "Agent ID가 필요합니다.",
        },
      });

      return;
    }

    const agent =
      await editAgent(
        agentId,
        request.body,
      );

    if (!agent) {
      response.status(404).json({
        error: {
          code:
            "AGENT_NOT_FOUND",

          message:
            "Agent를 찾을 수 없습니다.",
        },
      });

      return;
    }

    response.status(200).json({
      data: agent,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAgentController(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const agentId =
      getParamValue(
        request.params.agentId,
      );

    if (!agentId) {
      response.status(400).json({
        error: {
          code:
            "INVALID_AGENT_ID",

          message:
            "Agent ID가 필요합니다.",
        },
      });

      return;
    }

    const deleted =
      await removeAgent(
        agentId,
      );

    if (!deleted) {
      response.status(404).json({
        error: {
          code:
            "AGENT_NOT_FOUND",

          message:
            "Agent를 찾을 수 없습니다.",
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