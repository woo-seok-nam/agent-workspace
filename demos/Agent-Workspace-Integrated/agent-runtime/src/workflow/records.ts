import { z } from 'zod';
import { ToolTraceSchema } from './tool-trace.js';
import { WorkflowSchema } from './schema.js';
import { AgentError } from '../types.js';

const Status = z.enum(['Pending', 'Running', 'Completed', 'Failed', 'Skipped', 'Attention', 'Cancelled']);
export const RunRecordSchema = z.object({
  recordVersion: z.literal(1), runId: z.uuid(), parentRunId: z.uuid().optional(),
  rerunFromStepId: z.string().optional(),
  mode: z.enum(['demo', 'live']),
  startedAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
  durationMs: z.number().int().nonnegative(),
  goal: z.string().min(1).max(5000).refine(s => !!s.trim()),
  snapshot: WorkflowSchema,
  status: z.enum(['Running', 'Completed', 'Failed', 'Attention', 'Cancelled']),
  approvedSteps: z.array(z.string()).max(10).optional(),
  approval: z.object({ stepId: z.string(), approvedAt: z.iso.datetime() }).strict().optional(),
  steps: z.array(z.object({
    id: z.string(), agent: z.enum(['planner', 'writer', 'reviewer']),
    provider: z.enum(['openai', 'gemini', 'claude']), status: Status,
    toolTrace: ToolTraceSchema.optional(),
    errorCode: z.literal('STEP_TIMEOUT').optional(),
    output: z.string().optional(), error: z.string().optional(), agentRunId: z.string().optional(),
  }).strict()),
  events: z.array(z.object({ stepId: z.string(), status: Status }).strict()),
}).strict().superRefine((run, ctx) => {
  const invalid = () => ctx.addIssue({ code: 'custom', message: '실행 상태 불일치' });
  if (run.rerunFromStepId !== undefined && (!run.parentRunId || !run.snapshot.steps.some(s => s.id === run.rerunFromStepId))) invalid();
  if (run.steps.length !== run.snapshot.steps.length) invalid();
  const grants = run.approvedSteps ?? [];
  if (new Set(grants).size !== grants.length || grants.some(id => !run.snapshot.steps.some(s => s.id === id && s.reviewBefore))) invalid();
  if (run.approval && (!run.parentRunId || !grants.includes(run.approval.stepId))) invalid();
  let unfinished = false;
  for (const [i, step] of run.steps.entries()) {
    const spec = run.snapshot.steps[i];
    if (!spec || step.id !== spec.id || step.agent !== spec.agent || step.provider !== spec.provider) invalid();
    if (step.errorCode && (step.status !== 'Failed' || spec?.timeoutMs === undefined)) invalid();
    if (step.toolTrace && (!spec?.tools || !['Completed', 'Failed', 'Cancelled'].includes(step.status) || step.toolTrace.modelTurns > spec.tools.maxModelCalls || step.toolTrace.tools.length > spec.tools.maxToolCalls)) invalid();
    if (spec?.reviewBefore && ['Running','Completed','Failed'].includes(step.status) && !grants.includes(step.id)) invalid();
    if (step.status === 'Attention' && (!spec?.reviewBefore || grants.includes(step.id))) invalid();
    if (step.status === 'Completed') {
      if (unfinished || !step.output?.trim() || step.error !== undefined) invalid();
    } else {
      unfinished = true;
      if (step.output !== undefined || step.agentRunId !== undefined) invalid();
      if (['Failed', 'Cancelled'].includes(step.status) ? !step.error?.trim() : step.error !== undefined) invalid();
    }
  }
  const tail = run.steps.filter(s => s.status !== 'Completed').map(s => s.status);
  if (run.status === 'Cancelled' && (tail[0] !== 'Cancelled' || tail.slice(1).some(s => s !== 'Skipped'))) invalid();
  if (run.status === 'Attention' && (tail[0] !== 'Attention' || tail.slice(1).some(s => s !== 'Pending'))) invalid();
  if (run.status === 'Completed' && tail.length) invalid();
  if (run.status === 'Failed' && (tail[0] !== 'Failed' || tail.slice(1).some(s => s !== 'Skipped'))) invalid();
  if (run.status === 'Running' && tail.some((s, i) => s !== 'Pending' && !(i === 0 && s === 'Running'))) invalid();
  if (run.events.some(e => !run.snapshot.steps.some(s => s.id === e.stepId))) invalid();
});
export type WorkflowRun = z.infer<typeof RunRecordSchema>;
export type RunSummary = Pick<WorkflowRun, 'runId' | 'parentRunId' | 'mode' | 'status' | 'startedAt' | 'updatedAt'>;
// 제품 통합 시 Rust IPC 구현으로 교체합니다. SQLite 어댑터는 개발 CLI 전용입니다.
export interface WorkflowStore {
  save(run: WorkflowRun): void;
  get(runId: string): WorkflowRun | undefined;
  list(): RunSummary[];
}
export function parseRunRecord(value: unknown): WorkflowRun {
  const parsed = RunRecordSchema.safeParse(value);
  if (!parsed.success) throw new AgentError('저장된 실행 데이터 형식이 올바르지 않아 중단했습니다.');
  return parsed.data;
}
