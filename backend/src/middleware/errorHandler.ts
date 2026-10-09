import type {
  NextFunction,
  Request,
  Response,
} from "express";

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
) {
  console.error(error);

  if (
    error instanceof Error
  ) {
    response.status(500).json({
      error: {
        code:
          "INTERNAL_SERVER_ERROR",

        message:
          error.message,
      },
    });

    return;
  }

  response.status(500).json({
    error: {
      code:
        "INTERNAL_SERVER_ERROR",

      message:
        "알 수 없는 서버 오류가 발생했습니다.",
    },
  });
}