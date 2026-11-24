import { z } from 'zod';
import type { ToolTrace } from './tool-trace.js';
// 제품 소유 계약의 순차 실행 부분집합. LangGraph 타입은 이 파일에 포함하지 않습니다.
export const WorkflowSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),
  name: z.string().trim().min(1).max(100),
  steps: z.array(z.object({
    id: z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),
    agent: z.enum(['planner', 'writer', 'reviewer']),
    provider: z.enum(['openai', 'gemini', 'claude']),
    reviewBefore: z.boolean().optional(),
    timeoutMs: z.number().int().min(100).max(300_000).optional(),
    tools: z.object({ maxModelCalls: z.number().int().min(1).max(10).default(4), maxToolCalls: z.number().int().min(0).max(20).default(8) }).strict().optional(),
  }).strict()).min(1).max(10),
}).strict().refine(w => new Set(w.steps.map(s => s.id)).size === w.steps.length, '단계 ID는 중복될 수 없습니다.');
export type Workflow = z.infer<typeof WorkflowSchema>;
export type Step = Workflow['steps'][number];
export interface StepResult {
  id: string; agent: Step['agent']; provider: Step['provider'];
  status: 'Pending' | 'Running' | 'Completed' | 'Failed' | 'Skipped' | 'Attention' | 'Cancelled';
  output?: string; error?: string; errorCode?: 'STEP_TIMEOUT'; agentRunId?: string; toolTrace?: ToolTrace;
}
export interface StepInput { signal?: AbortSignal; step: Step; goal: string; previous: { stepId: string; output: string }[] }
export type StepOutput = ({ ok: true; text: string; agentRunId?: string } | { ok: false; error: string }) & { toolTrace?: ToolTrace };
export type StepExecutor = (input: StepInput) => Promise<StepOutput>;
export interface WorkflowEvent { stepId: string; status: StepResult['status'] }
