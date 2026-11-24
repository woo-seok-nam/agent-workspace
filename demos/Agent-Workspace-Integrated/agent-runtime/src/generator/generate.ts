import { z } from 'zod';
import { setTimeout as delay } from 'node:timers/promises';
import { randomUUID } from 'node:crypto';
import { GeneratorRequestSchema, type DraftResponse, type GeneratorRequest } from './schema.js';
import { validateDraft, type Validation, type Issue } from './validate.js';
import { buildContext, PROMPT_VERSION, SYSTEM_PROMPT } from './prompt.js';
import { GenerationError, type GenerationProvider, type Usage } from './provider.js';
export const LimitsSchema = z.object({
  maxRepairs: z.number().int().min(0).max(5).default(2),
  maxApiRetries: z.number().int().min(0).max(3).default(1),
  totalTimeoutMs: z.number().int().min(1).max(600_000).default(120_000),
  maxOutputTokens: z.number().int().min(512).max(32000).default(8192),
  maxContextChars: z.number().int().min(100).max(200_000).default(60000),
  retryDelayMs: z.number().int().min(0).max(10000).default(500),
}).strict();
export type Limits = z.infer<typeof LimitsSchema>;
export interface GenerationRecord {
  revision_changes?: string[];
  run_id: string; started_at: string; duration_ms: number;
  schema_version: '0.1'; prompt_version: string; model: string; mode: GenerationProvider['mode']; limits: Limits;
  request: GeneratorRequest;
  outcome: 'draft' | 'needs_clarification' | 'failed'; response: DraftResponse | null;
  validation: Validation | null; human_review_required: boolean;
  error: { code: string; message: string } | null;
  stats: { model_calls: number; api_retries: number; repairs: number; usage: Usage; usage_complete: boolean };
  attempts: { version: number; candidate: unknown; validation: Validation; changes: string[]; response_id: string | null }[];
}
function changes(previous: unknown, next: unknown, path = '$', result: string[] = []): string[] {
  if (JSON.stringify(previous) === JSON.stringify(next)) return result;
  if (result.length >= 100) return result;
  if (previous && next && typeof previous === 'object' && typeof next === 'object') {
    for (const key of new Set([...Object.keys(previous), ...Object.keys(next)]))
      changes((previous as Record<string, unknown>)[key], (next as Record<string, unknown>)[key], `${path}.${key}`, result);
  } else result.push(path);
  return result;
}
export async function generateWorkflow(raw: unknown, provider: GenerationProvider, options: Partial<Limits> = {}, signal?: AbortSignal): Promise<GenerationRecord> {
  const request = GeneratorRequestSchema.parse(raw), limits = LimitsSchema.parse(options);
  const start = Date.now(), deadline = AbortSignal.timeout(limits.totalTimeoutMs);
  const combined = signal ? AbortSignal.any([deadline, signal]) : deadline;
  const record: GenerationRecord = {
    run_id: randomUUID(), started_at: new Date(start).toISOString(), duration_ms: 0,
    schema_version: '0.1', prompt_version: PROMPT_VERSION, model: provider.model, mode: provider.mode, limits, request,
    outcome: 'failed', response: null, validation: null, human_review_required: false, error: null,
    stats: { model_calls: 0, api_retries: 0, repairs: 0, usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 }, usage_complete: true }, attempts: [],
  };
  let locked: DraftResponse['intent'] | null = request.draft_revision ? structuredClone(request.draft_revision.previous_draft.intent) : null;
  if (locked) locked.requirements = [...new Set([...locked.requirements, ...request.confirmed_requirements])];
  const account = (usage: Usage | null) => {
    if (!usage) record.stats.usage_complete = false;
    else for (const k of ['input_tokens', 'output_tokens', 'total_tokens'] as const) record.stats.usage[k] += usage[k];
  };
  try {
    for (let version = 0; version <= limits.maxRepairs; version++) {
      combined.throwIfAborted();
      record.stats.repairs = version;
      const previous = record.attempts.at(-1);
      const context = buildContext(request, previous ? { previous_candidate: previous.candidate, validation_errors: previous.validation.errors, locked_intent: locked } : undefined);
      if (context.length > limits.maxContextChars) throw new GenerationError('CONTEXT_LIMIT', '입력과 보정 문맥의 길이 한도를 초과했습니다. 자료 또는 요청을 줄이세요.');
      let reply;
      while (true) {
        combined.throwIfAborted();
        record.stats.model_calls++;
        try {
          reply = await provider.generate({ system: SYSTEM_PROMPT, context, maxOutputTokens: limits.maxOutputTokens, signal: combined });
          account(reply.usage); break;
        } catch (e) {
          account(e instanceof GenerationError ? e.usage : null);
          if (combined.aborted || !(e instanceof GenerationError) || !e.retryable || record.stats.api_retries >= limits.maxApiRetries) throw e;
          record.stats.api_retries++;
          await delay(limits.retryDelayMs * record.stats.api_retries, undefined, { signal: combined });
        }
      }
      combined.throwIfAborted();
      const checked = validateDraft(reply.value, request);
      if (checked.response?.status === 'draft') {
        if (locked) {
          const after = checked.response.intent;
          const extra: Issue[] = [];
          if ((locked.goal.trim() && after.goal !== locked.goal) || (locked.deliverable.trim() && after.deliverable !== locked.deliverable) || JSON.stringify([...after.requirements].sort()) !== JSON.stringify([...locked.requirements].sort()))
            extra.push({ code: 'INTENT_CHANGED_DURING_REPAIR', node_id: null, path: 'intent', message: '보정 중 목적·산출물·필수 조건을 바꿀 수 없습니다. 기존 intent를 복구하거나 사용자에게 질문하세요.' });
          checked.validation.errors.push(...extra); checked.validation.passed = checked.validation.errors.length === 0;
          // Missing values may be completed; previously stated values remain locked.
          if (!locked.goal.trim()) locked.goal = after.goal;
          if (!locked.deliverable.trim()) locked.deliverable = after.deliverable;
        } else {
          locked = structuredClone(checked.response.intent);
          // A dropped user constraint must remain repairable, never frozen as absent.
          locked.requirements = [...new Set([...locked.requirements, ...request.confirmed_requirements])];
        }
      }
      record.attempts.push({ version, candidate: reply.value, validation: checked.validation, changes: previous ? changes(previous.candidate, reply.value) : [], response_id: reply.response_id });
      record.response = checked.response; record.validation = checked.validation;
      if (checked.validation.passed && checked.response) {
        record.outcome = checked.response.status;
        record.human_review_required = checked.response.status === 'draft';
        return record;
      }
    }
    throw new GenerationError('VALIDATION_FAILED', '보정 한도 내에 차단 오류를 해결하지 못했습니다. 마지막 초안과 검증 오류를 확인하세요.');
  } catch (e) {
    const error = combined.aborted
      ? new GenerationError(signal?.aborted ? 'CANCELLED' : 'GENERATION_TIMEOUT', signal?.aborted ? '사용자가 생성을 취소했습니다.' : '전체 생성 시간 한도를 초과했습니다.')
      : e instanceof GenerationError ? e : new GenerationError('GENERATION_ERROR', '생성 처리 중 오류가 발생했습니다.');
    record.error = { code: error.code, message: error.message };
    return record;
  } finally {
    record.duration_ms = Date.now() - start;
    if (request.draft_revision && record.response) record.revision_changes = changes(request.draft_revision.previous_draft, record.response);
  }
}
