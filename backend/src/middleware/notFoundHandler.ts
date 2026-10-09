import type {
  Request,
  Response,
} from "express";

export function notFoundHandler(
  request: Request,
  response: Response,
) {
  response.status(404).json({
    error: {
      code: "NOT_FOUND",

      message:
        "요청한 API를 찾을 수 없습니다.",

      path: request.originalUrl,
    },
  });
}