import type { StepExecutor, StepInput, StepOutput } from './schema.js';

type Termination = 'timeout' | 'cancelled';

/** 단계 전체에 하나의 제한 시간을 적용하며, 중단된 실행기의 정리가 끝난 뒤 반환합니다. */
export async function executeStep(input: StepInput, execute: StepExecutor): Promise<{
  result: StepOutput; termination: Termination | undefined;
}> {
  const controller = new AbortController();
  let termination: Termination | undefined;
  const stop = (cause: Termination) => {
    if (termination) return;
    termination = cause;
    controller.abort();
  };
  const cancel = () => stop('cancelled');
  const limit = input.step.timeoutMs;
  const started = performance.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let result: StepOutput;
  if (input.signal?.aborted) cancel();
  else input.signal?.addEventListener('abort', cancel, { once: true });
  if (!termination && limit !== undefined) timer = setTimeout(() => stop('timeout'), limit);
  try {
    result = termination
      ? { ok: false, error: '사용자가 실행을 취소했습니다.' }
      : await execute({ ...input, signal: controller.signal });
    // 동기 작업으로 이벤트 루프가 지연된 경우에도 제한 이후 결과를 성공 처리하지 않습니다.
    if (!termination && limit !== undefined && performance.now() - started >= limit) stop('timeout');
  } catch {
    result = { ok: false, error: '단계 실행 중 내부 오류가 발생했습니다.' };
    if (!termination && limit !== undefined && performance.now() - started >= limit) stop('timeout');
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    input.signal?.removeEventListener('abort', cancel);
  }
  if (termination === 'timeout') result = {
    ok: false, error: `단계 실행 제한 시간(${limit}ms)을 초과했습니다.`,
    ...(result.toolTrace ? { toolTrace: result.toolTrace } : {}),
  };
  return { result, termination };
}
