import { AgentError } from "../types.js";
export type Transport = typeof fetch;
export const object = (x: unknown): Record<string, unknown> =>
  x !== null && typeof x === "object" && !Array.isArray(x) ? x as Record<string, unknown> : {};
export const array = (x: unknown): unknown[] => Array.isArray(x) ? x : [];
export const text = (x: unknown): string => typeof x === "string" ? x : "";

export async function post(url: string, headers: Record<string, string>, body: unknown, transport: Transport, cancellation?: AbortSignal): Promise<Record<string, unknown>> {
  const timeout = AbortSignal.timeout(60_000);
  const signal = cancellation ? AbortSignal.any([timeout, cancellation]) : timeout;
  try {
    signal.throwIfAborted();
    const response = await transport(url, {
      method: "POST", headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body), signal, redirect: "error",
    });
    if (!response.ok) {
      await response.body?.cancel();
      const hint = response.status === 401 || response.status === 403 ? "API 키와 접근 권한을 확인하세요."
        : response.status === 429 ? "요청 한도 또는 API 사용 잔액을 확인하세요."
        : response.status === 400 || response.status === 404 ? "모델 ID와 해당 API 지원 여부를 확인하세요."
        : "공급자 서비스 상태를 확인하세요.";
      throw new AgentError(`API HTTP ${response.status}: ${hint}`);
    }
    return object(await response.json());
  } catch (error) {
    if (error instanceof AgentError) throw error;
    // 공급자 응답 원문·인증 헤더를 오류 로그에 포함하지 않습니다.
    throw new AgentError(cancellation?.aborted ? "사용자가 실행을 취소했습니다." : timeout.aborted ? "API 요청 제한 시간(60초)을 초과했습니다." : "네트워크 연결 또는 API 응답 형식을 확인하세요.");
  }
}
export function requireText(value: string): string {
  if (!value.trim()) throw new AgentError("텍스트 답변이 없습니다. 거부·필터링·출력 한도 또는 모델 지원 범위를 확인하세요.");
  return value;
}
