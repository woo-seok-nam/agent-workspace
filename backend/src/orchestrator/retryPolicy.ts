export interface RetryDecision {
  retryable: boolean;

  category:
    | "RATE_LIMIT"
    | "SERVICE_UNAVAILABLE"
    | "TIMEOUT"
    | "QUOTA_EXCEEDED"
    | "AUTHENTICATION"
    | "MODEL_NOT_FOUND"
    | "UNKNOWN";

  message: string;
}

function errorToText(
  error: unknown,
): string {
  if (
    error instanceof Error
  ) {
    return [
      error.name,
      error.message,
      error.stack ?? "",
    ]
      .join(
        " ",
      )
      .toLowerCase();
  }

  if (
    typeof error === "string"
  ) {
    return error.toLowerCase();
  }

  try {
    return JSON.stringify(
      error,
    ).toLowerCase();
  } catch {
    return String(
      error,
    ).toLowerCase();
  }
}

export function classifyExecutionError(
  error: unknown,
): RetryDecision {
  const text =
    errorToText(
      error,
    );

  /*
   * Quota / Billing 부족
   *
   * 이 오류는 몇 초 기다렸다가 다시 호출해도
   * 해결되지 않기 때문에 자동 재시도하지 않는다.
   */
  if (
    text.includes(
      "no credits remaining",
    ) ||
    text.includes(
      "insufficient_quota",
    ) ||
    text.includes(
      "exceeded your current quota",
    ) ||
    text.includes(
      "quota exceeded",
    ) ||
    text.includes(
      "billing",
    )
  ) {
    return {
      retryable:
        false,

      category:
        "QUOTA_EXCEEDED",

      message:
        "API 사용 한도 또는 크레딧이 부족합니다. Provider의 사용량 및 결제 설정을 확인해주세요.",
    };
  }

  /*
   * 인증 문제
   */
  if (
    text.includes(
      "401",
    ) ||
    text.includes(
      "unauthorized",
    ) ||
    text.includes(
      "invalid api key",
    ) ||
    text.includes(
      "authentication",
    )
  ) {
    return {
      retryable:
        false,

      category:
        "AUTHENTICATION",

      message:
        "API 인증에 실패했습니다. API Key 설정을 확인해주세요.",
    };
  }

  /*
   * 존재하지 않거나 지원되지 않는 모델
   */
  if (
    text.includes(
      "404",
    ) ||
    text.includes(
      "model not found",
    ) ||
    text.includes(
      "not found for api version",
    ) ||
    text.includes(
      "no longer available",
    ) ||
    text.includes(
      "\"status\":\"not_found\"",
    )
  ) {
    return {
      retryable:
        false,

      category:
        "MODEL_NOT_FOUND",

      message:
        "현재 설정된 AI 모델을 사용할 수 없습니다. Agent의 Model 설정을 확인해주세요.",
    };
  }

  /*
   * 서버 과부하 / 일시적 Provider 장애
   */
  if (
    text.includes(
      "503",
    ) ||
    text.includes(
      "unavailable",
    ) ||
    text.includes(
      "high demand",
    ) ||
    text.includes(
      "temporarily unavailable",
    )
  ) {
    return {
      retryable:
        true,

      category:
        "SERVICE_UNAVAILABLE",

      message:
        "AI Provider가 일시적으로 응답할 수 없습니다.",
    };
  }

  /*
   * 일반적인 Rate Limit
   *
   * quota exceeded 문구는 위에서 먼저 걸러졌기 때문에
   * 여기 도달한 429는 잠시 후 해결될 가능성이 있다.
   */
  if (
    text.includes(
      "429",
    ) ||
    text.includes(
      "rate limit",
    ) ||
    text.includes(
      "too many requests",
    )
  ) {
    return {
      retryable:
        true,

      category:
        "RATE_LIMIT",

      message:
        "API 요청 제한에 도달했습니다.",
    };
  }

  /*
   * Timeout
   */
  if (
    text.includes(
      "timeout",
    ) ||
    text.includes(
      "timed out",
    ) ||
    text.includes(
      "aborterror",
    )
  ) {
    return {
      retryable:
        true,

      category:
        "TIMEOUT",

      message:
        "API 요청 시간이 초과되었습니다.",
    };
  }

  return {
    retryable:
      false,

    category:
      "UNKNOWN",

    message:
      error instanceof Error
        ? error.message
        : "알 수 없는 실행 오류가 발생했습니다.",
  };
}

export function getRetryDelay(
  retryAttempt: number,
) {
  /*
   * Exponential Backoff
   *
   * retryAttempt = 1 → 1초
   * retryAttempt = 2 → 2초
   * retryAttempt = 3 → 4초
   * retryAttempt = 4 → 8초
   *
   * 최대 10초
   */
  const milliseconds =
    1000 *
    2 **
      Math.max(
        0,
        retryAttempt -
          1,
      );

  return Math.min(
    milliseconds,
    10_000,
  );
}

export function sleep(
  milliseconds: number,
) {
  return new Promise<void>(
    (resolve) => {
      setTimeout(
        resolve,
        milliseconds,
      );
    },
  );
}