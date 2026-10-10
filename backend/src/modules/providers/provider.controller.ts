import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  editProvider,
  getProvider,
  getProviders,
} from "./provider.service.js";

import type {
  UpdateProviderInput,
} from "./provider.types.js";

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

export async function listProviders(
  _request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const providers =
      await getProviders();

    response.status(200).json({
      data: providers,
    });
  } catch (error) {
    next(error);
  }
}

export async function readProvider(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const providerId =
      getParamValue(
        request.params.providerId,
      );

    if (!providerId) {
      response.status(400).json({
        error: {
          code:
            "INVALID_PROVIDER_ID",

          message:
            "Provider ID가 필요합니다.",
        },
      });

      return;
    }

    const provider =
      await getProvider(
        providerId,
      );

    if (!provider) {
      response.status(404).json({
        error: {
          code:
            "PROVIDER_NOT_FOUND",

          message:
            "Provider를 찾을 수 없습니다.",
        },
      });

      return;
    }

    response.status(200).json({
      data:
        provider,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProviderController(
  request: Request<
    {
      providerId: string;
    },
    unknown,
    UpdateProviderInput
  >,
  response: Response,
  next: NextFunction,
) {
  try {
    const providerId =
      getParamValue(
        request.params.providerId,
      );

    if (!providerId) {
      response.status(400).json({
        error: {
          code:
            "INVALID_PROVIDER_ID",

          message:
            "Provider ID가 필요합니다.",
        },
      });

      return;
    }

    const provider =
      await editProvider(
        providerId,
        request.body,
      );

    if (!provider) {
      response.status(404).json({
        error: {
          code:
            "PROVIDER_NOT_FOUND",

          message:
            "Provider를 찾을 수 없습니다.",
        },
      });

      return;
    }

    response.status(200).json({
      data:
        provider,
    });
  } catch (error) {
    next(error);
  }
}