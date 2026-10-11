import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  createGuidedWorkflow,
  recommendWorkflowFromGoal,
} from "./guidance.service.js";

interface RecommendGuidanceRequestBody {
  goal?: unknown;
}

interface CreateGuidedWorkflowRequestBody {
  goal?: unknown;

  playbookId?: unknown;
}

export function recommendWorkflowController(
  request: Request<
    Record<string, never>,
    unknown,
    RecommendGuidanceRequestBody
  >,
  response: Response,
  next: NextFunction,
) {
  try {
    const rawGoal =
      request.body?.goal;

    if (
      typeof rawGoal !==
      "string"
    ) {
      response.status(
        400,
      ).json({
        error:
          "goal은 문자열이어야 합니다.",
      });

      return;
    }

    const goal =
      rawGoal.trim();

    if (!goal) {
      response.status(
        400,
      ).json({
        error:
          "작업 목표를 입력해주세요.",
      });

      return;
    }

    const result =
      recommendWorkflowFromGoal({
        goal,
      });

    response.status(
      200,
    ).json({
      data:
        result,
    });
  } catch (error) {
    next(
      error,
    );
  }
}

export async function createGuidedWorkflowController(
  request: Request<
    Record<string, never>,
    unknown,
    CreateGuidedWorkflowRequestBody
  >,
  response: Response,
  next: NextFunction,
) {
  try {
    const rawGoal =
      request.body?.goal;

    const rawPlaybookId =
      request.body?.playbookId;

    if (
      typeof rawGoal !==
      "string"
    ) {
      response.status(
        400,
      ).json({
        error:
          "goal은 문자열이어야 합니다.",
      });

      return;
    }

    const goal =
      rawGoal.trim();

    if (!goal) {
      response.status(
        400,
      ).json({
        error:
          "작업 목표를 입력해주세요.",
      });

      return;
    }

    let playbookId:
      string | undefined;

    if (
      rawPlaybookId !==
      undefined
    ) {
      if (
        typeof rawPlaybookId !==
        "string"
      ) {
        response.status(
          400,
        ).json({
          error:
            "playbookId는 문자열이어야 합니다.",
        });

        return;
      }

      const normalized =
        rawPlaybookId.trim();

      if (
        normalized
      ) {
        playbookId =
          normalized;
      }
    }

    const result =
      await createGuidedWorkflow({
        goal,

        playbookId,
      });

    response.status(
      201,
    ).json({
      data:
        result,
    });
  } catch (error) {
    next(
      error,
    );
  }
}