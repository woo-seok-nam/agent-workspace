import { z } from 'zod';
import { executeDraft, ExecutionInput, type ExecutionRecord, type StepCall } from './run.js';
const checkpointSchema = z.object({
  id: z.string().uuid(), status: z.enum(['running', 'failed', 'cancelled']),
  snapshot: z.object({ version: z.literal(1), generation: z.unknown(), inputs: ExecutionInput, max_revisions: z.number().int().min(0).max(3) }).strict(),
  steps: z.array(z.object({ attempt: z.number().int().positive(), node_id: z.string(), outputs: z.record(z.string(), z.string()), verdict: z.string().nullable(), issues: z.array(z.string()) }).strict()).max(200),
});
export class ResumeError extends Error {
  constructor() { super('재개할 수 없는 기록입니다. v0.21.0 이후의 running/failed/cancelled 기록과 원본 스냅샷이 필요합니다. 기록의 단계 순서·출력 형식도 확인하세요.'); }
}
export async function resumeExecution(value: unknown, call: StepCall, signal: AbortSignal, hooks: { checkpoint?: (record: ExecutionRecord) => Promise<void> } = {}): Promise<ExecutionRecord> {
  const parsed = checkpointSchema.safeParse(value);
  if (!parsed.success) throw new ResumeError();
  const old = structuredClone(parsed.data), snapshot = old.snapshot;
  function replay(live: boolean) {
    let position = 0, exhausted = false;
    const attempts = new Map<string, number>();
    const invoke: StepCall = async (prompt, sig, schema) => {
      const id = JSON.parse(prompt).node.id as string;
      const attempt = (attempts.get(id) ?? 0) + 1; attempts.set(id, attempt);
      if (position < old.steps.length) {
        const step = old.steps[position]!;
        if (step.node_id !== id || step.attempt !== attempt) throw new ResumeError();
        position++;
        return JSON.stringify({ outputs: step.outputs, verdict: step.verdict, issues: step.issues });
      }
      exhausted = true;
      if (!live) throw new Error('REPLAY_COMPLETE');
      return call(prompt, sig, schema);
    };
    return { invoke, exhausted: () => exhausted, position: () => position };
  }
  // Reconstruct and validate all saved outputs with the same runner before any new model request.
  const probe = replay(false);
  const checked = await executeDraft(snapshot.generation, snapshot.inputs, probe.invoke, signal, { maxRevisions: snapshot.max_revisions });
  if (signal.aborted) {
    checked.resumed_from = old.id; checked.reused_steps = checked.steps.length;
    await hooks.checkpoint?.(structuredClone(checked)); return checked;
  }
  if (checked.steps.length !== old.steps.length || probe.position() !== old.steps.length || (!probe.exhausted() && checked.status !== 'completed' && checked.status !== 'needs_review')) throw new ResumeError();
  if (checked.status === 'cancelled') return checked;
  const real = replay(true);
  const result = await executeDraft(snapshot.generation, snapshot.inputs, real.invoke, signal, { maxRevisions: snapshot.max_revisions }, {
    checkpoint: async state => {
      state.resumed_from = old.id; state.reused_steps = Math.min(old.steps.length, state.steps.length);
      await hooks.checkpoint?.(state);
    },
  });
  result.resumed_from = old.id; result.reused_steps = Math.min(old.steps.length, result.steps.length);
  return result;
}
