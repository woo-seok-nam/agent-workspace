import { z } from 'zod';
import { resumeExecution } from './resume.js';
import { executeDraft, type ExecutionRecord, type StepCall } from './run.js';
import { DraftResponseSchema, GeneratorRequestSchema, type WorkflowNode } from '../generator/schema.js';
export class ReviewEditError extends Error {
  constructor() { super('수정하려면 스냅샷이 있는 needs_review 기록과 1~2,000자의 수정 지시가 필요합니다. 기록 형식과 입력 크기를 확인하세요.'); }
}
export async function reviseExecution(value: unknown, feedbackValue: unknown, call: StepCall, signal: AbortSignal, options: { maxRevisions?: number } = {}, hooks: { checkpoint?: (r: ExecutionRecord) => Promise<void> } = {}): Promise<ExecutionRecord> {
  const feedback = z.string().trim().min(1).max(2000).safeParse(feedbackValue);
  const parsed = z.object({ status: z.literal('needs_review'), id: z.string().uuid() }).safeParse(value);
  if (!parsed.success || !feedback.success) throw new ReviewEditError();
  let prior: ExecutionRecord;
  try {
    // Validate saved history without calling a provider. needs_review must be reproducible.
    prior = await resumeExecution({ ...(value as object), status: 'running' }, async () => { throw new Error('NO_NETWORK'); }, signal);
    if (prior.status === 'cancelled' && signal.aborted) {
      prior.revised_from = parsed.data.id; prior.user_feedback = feedback.data;
      await hooks.checkpoint?.(structuredClone(prior)); return prior;
    }
    if (prior.status !== 'needs_review' || !prior.snapshot) throw new ReviewEditError();
  } catch { throw new ReviewEditError(); }
  const snapshot = prior.snapshot!;
  const envelope = z.object({ request: GeneratorRequestSchema, response: DraftResponseSchema }).parse(snapshot.generation);
  const original = envelope.response;
  const work = [...prior.steps].reverse().find(s => s.verdict === null);
  const review = prior.steps.at(-1);
  if (!work || !review || !original.workflow) throw new ReviewEditError();
  const requirement = `사용자 수정 지시: ${feedback.data}`;
  const requirements = [...original.intent.requirements, requirement];
  const port = (name: string, description: string) => ({ name, description, type: 'text' as const, required: true, fields: [] });
  const sources = [port('original_inputs','이전 실행의 원본 입력 묶음'), port('previous_draft','이전 작성 결과'), port('review_feedback','이전 검토의 미해결 사항')];
  const task = (kind: 'work' | 'final_review', instructions: string) => ({ kind, purpose: kind === 'work' ? '사용자 지시와 검토 의견에 따라 산출물 수정' : '수정본의 요구사항과 원본 근거 검토', instructions,
    completion_criteria: ['기존 요구사항과 사용자 수정 지시를 검토하고 미해결 사항을 명시한다.'],
    rationale: { kind: 'model_proposal' as const, reference_id: null, location: null, reason: '사용자가 요청한 수정과 재검토를 위한 절차' }, prerequisites: [], required_tools: [], missing_capabilities: [], requirement_refs: requirements });
  const nodes: WorkflowNode[] = [
    { id: 'input', type: 'input', name: '이전 자료와 초안', input_ports: [], output_ports: sources, task: null },
    { id: 'rewrite', type: 'work_step', name: '사용자 지시에 따른 수정', input_ports: sources, output_ports: [port('draft','수정된 전체 산출물')], task: task('work', `원본 입력과 이전 초안, 검토 의견을 대조해 전체 수정본을 작성한다. 원본에 없는 사실은 만들지 않는다. ${requirement}. 기존 요구사항과 충돌하거나 자료 부족으로 해결할 수 없는 사항은 숨기지 말고 명시한다. 수정 계획만 반환하지 않는다.`) },
    { id: 'review', type: 'work_step', name: '수정본 최종 검토', input_ports: [...sources, port('draft','새 수정본')], output_ports: [port('result','검토된 전체 산출물')], task: task('final_review', `새 draft를 원본 입력과 대조하고 기존 요구사항 및 다음 사용자 수정 지시의 반영 여부를 검토한다: ${feedback.data}. 이전 초안의 이미 해결된 문제를 새 수정본에 반복 지적하지 않는다. 핵심 미해결 문제는 needs_revision과 issues로 표시한다. 통과 시 outputs에 전체 검토본을 반환한다.`) },
    { id: 'output', type: 'output', name: '검토된 수정본 전달', input_ports: [port('report','검토된 산출물')], output_ports: [], task: null },
  ];
  const edges = sources.flatMap(p => ['rewrite','review'].map(target => ({ source_node:'input',source_port:p.name,target_node:target,target_port:p.name })));
  edges.push({source_node:'rewrite',source_port:'draft',target_node:'review',target_port:'draft'}, {source_node:'review',source_port:'result',target_node:'output',target_port:'report'});
  const response = { ...original, intent: { ...original.intent, requirements }, workflow: { name: '사용자 피드백 반영 및 재검토', nodes, edges } };
  const generation = { outcome: 'draft', request: { ...envelope.request, confirmed_requirements: [...envelope.request.confirmed_requirements, requirement] }, response };
  const inputs = { original_inputs: JSON.stringify(snapshot.inputs), previous_draft: JSON.stringify(work.outputs), review_feedback: JSON.stringify(review.issues.length ? review.issues : review.outputs) };
  const decorate = (r: ExecutionRecord) => { r.revised_from = parsed.data.id; r.user_feedback = feedback.data; };
  const result = await executeDraft(generation, inputs, call, signal, options, { checkpoint: async r => { decorate(r); await hooks.checkpoint?.(r); } });
  decorate(result); return result;
}
