import { z } from 'zod';
import { WorkflowSchema } from '../workflow/schema.js';
export const RequestId = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);
const Base = { protocolVersion: z.literal(1), requestId: RequestId };
export const METHODS = ['run.start', 'run.get', 'run.list', 'run.resume', 'run.rerun', 'run.approve', 'run.cancel'];
export const RequestSchema = z.discriminatedUnion('method', [
  z.object({ ...Base, method: z.literal('run.cancel'), params: z.object({ targetRequestId: RequestId }).strict() }).strict(),
  z.object({ ...Base, method: z.literal('run.approve'), params: z.object({
    runId: z.uuid(), mode: z.enum(['demo', 'live']), stepId: z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),
  }).strict() }).strict(),
  z.object({ ...Base, method: z.literal('run.start'), params: z.object({
    mode: z.enum(['demo', 'live']), goal: z.string().min(1).max(5000).refine(s => !!s.trim()),
    workflow: WorkflowSchema,
  }).strict() }).strict(),
  z.object({ ...Base, method: z.literal('run.get'), params: z.object({ runId: z.uuid() }).strict() }).strict(),
  z.object({ ...Base, method: z.literal('run.list'), params: z.object({}).strict() }).strict(),
  z.object({ ...Base, method: z.literal('run.resume'), params: z.object({
    runId: z.uuid(), mode: z.enum(['demo', 'live']), recoverInterrupted: z.boolean().default(false),
  }).strict() }).strict(),
  z.object({ ...Base, method: z.literal('run.rerun'), params: z.object({
    runId: z.uuid(), mode: z.enum(['demo', 'live']), stepId: z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),
  }).strict() }).strict(),
]);
export type Request = z.infer<typeof RequestSchema>;
export type Message =
  | { protocolVersion: 1; type: 'ready'; methods: string[] }
  | { protocolVersion: 1; type: 'event'; requestId: string; event: 'step.status'; stepId: string; status: string }
  | { protocolVersion: 1; type: 'response'; requestId: string | null; ok: true; data: unknown }
  | { protocolVersion: 1; type: 'response'; requestId: string | null; ok: false; error: { code: string; message: string } };
export const errorResponse = (requestId: string | null, code: string, message: string): Message =>
  ({ protocolVersion: 1, type: 'response', requestId, ok: false, error: { code, message } });
