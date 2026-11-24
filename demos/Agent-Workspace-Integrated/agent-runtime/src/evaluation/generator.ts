import { createHash } from 'node:crypto';
import { z } from 'zod';
import { GeneratorRequestSchema } from '../generator/schema.js';
import { generateWorkflow, type GenerationRecord, type Limits } from '../generator/generate.js';
import type { GenerationProvider } from '../generator/provider.js';
import { sampleDraft } from '../generator/demo.js';
const prerequisiteKind = z.enum(['input', 'human', 'tool']);
export const CaseSchema = z.object({ id: z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/), input: GeneratorRequestSchema, expected_status: z.enum(['draft','needs_clarification']), prerequisite_checks: z.object({ required_any: z.array(prerequisiteKind).max(3), forbidden: z.array(prerequisiteKind).max(3), allow_unclassified: z.boolean() }).strict().optional(), review: z.array(z.string().min(1)).min(1).max(20) }).strict();
export const SuiteSchema = z.array(CaseSchema).min(1).max(20).superRefine((cases, ctx) => {
  if (new Set(cases.map(c=>c.id)).size !== cases.length) ctx.addIssue({code:'custom',message:'평가 사례 ID가 중복되었습니다.'});
});
export type EvaluationCase = z.infer<typeof CaseSchema>;
export interface EvaluationRow {
  case_fingerprint: string;
  case_id: string; repetition: number; expected_status: string; outcome: string;
  structure_passed: boolean; first_structure_passed: boolean; expected_status_matched: boolean; automatic_passed: boolean;
  duration_ms: number; model_calls: number; repairs: number; api_retries: number; error_codes: string[];
  model: string; prompt_version: string; generation_id: string;
  prerequisite_checks: { rule: string; passed: boolean }[];
  prerequisites_passed: boolean | null;
  human_review: { criterion: string; status: 'pending' }[];
}
export interface EvaluationSummary { scoring_version: '2'; mode: 'demo'|'live'; planned: number; evaluated: number; cancelled: boolean; scope: string; rows: EvaluationRow[]; metrics: ReturnType<typeof metrics> }
const fraction=(n:number,total:number)=>total?n/total:null;
export function metrics(rows:EvaluationRow[]) {
  const n=rows.length;
  const checked = rows.filter(r => r.prerequisites_passed !== null);
  return { prerequisites_evaluated: checked.length, prerequisites_pass_rate: fraction(checked.filter(r => r.prerequisites_passed).length, checked.length), structure_pass_rate:fraction(rows.filter(r=>r.structure_passed).length,n), first_structure_pass_rate:fraction(rows.filter(r=>r.first_structure_passed).length,n), expected_status_match_rate:fraction(rows.filter(r=>r.expected_status_matched).length,n), automatic_pass_rate:fraction(rows.filter(r=>r.automatic_passed).length,n), failed_count:rows.filter(r=>r.outcome==='failed').length,
    mean_duration_ms:n?rows.reduce((s,r)=>s+r.duration_ms,0)/n:null, model_calls:rows.reduce((s,r)=>s+r.model_calls,0), repairs:rows.reduce((s,r)=>s+r.repairs,0), api_retries:rows.reduce((s,r)=>s+r.api_retries,0), human_quality_score:null };
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',') + '}';
  return JSON.stringify(value);
}
export function caseFingerprint(c: EvaluationCase): string {
  return createHash('sha256').update(canonical(c)).digest('hex');
}
export function score(c:EvaluationCase, r:GenerationRecord, repetition:number):EvaluationRow {
  const structure=r.validation?.passed===true && r.outcome!=='failed', matched=r.outcome===c.expected_status;
  const checks: { rule: string; passed: boolean }[] = [];
  if (c.prerequisite_checks) {
    const tasks = r.response?.workflow?.nodes.flatMap(n => n.task ? [n.task] : []) ?? [];
    const kinds = new Set(tasks.flatMap(t => (t.prerequisites ?? []).map(p => p.kind)));
    const valid = structure && r.outcome === 'draft';
    const spec = c.prerequisite_checks;
    if (spec.required_any.length) checks.push({ rule: `선행 조건 중 하나 필요: ${spec.required_any.join(', ')}`, passed: valid && spec.required_any.some(k => kinds.has(k)) });
    for (const kind of spec.forbidden) checks.push({ rule: `불필요한 선행 조건 금지: ${kind}`, passed: valid && !kinds.has(kind) });
    if (!spec.allow_unclassified) checks.push({ rule: '분류되지 않은 missing_capabilities 없음', passed: valid && tasks.every(t => !t.missing_capabilities.length) });
  }
  const prerequisitesPassed = checks.length ? checks.every(c => c.passed) : null;
  return {case_fingerprint:caseFingerprint(c),prerequisite_checks:checks,prerequisites_passed:prerequisitesPassed,case_id:c.id,repetition,expected_status:c.expected_status,outcome:r.outcome,structure_passed:structure,first_structure_passed:r.attempts[0]?.validation.passed===true,expected_status_matched:matched,automatic_passed:structure&&matched&&prerequisitesPassed!==false,duration_ms:r.duration_ms,model_calls:r.stats.model_calls,repairs:r.stats.repairs,api_retries:r.stats.api_retries,error_codes:[...(r.error?[r.error.code]:[]),...(r.validation?.errors.map(e=>e.code)??[])],model:r.model,prompt_version:r.prompt_version,generation_id:r.run_id,human_review:c.review.map(criterion=>({criterion,status:'pending'}))};
}
export function fixtureProvider(c:EvaluationCase):GenerationProvider {
  return { model:'fixture-no-model',mode:'demo',async generate(){
    const value=sampleDraft(c.input);
    // Deliberately constructed fixture; never used in live generation or its prompt.
    if(c.prerequisite_checks?.required_any.length) {
      const kind = c.prerequisite_checks.required_any[0]!;
      value.workflow!.nodes.find(n => n.task)!.task!.prerequisites = [{ kind, description:'평가 도구 검사용 고정 선행 조건', input_port:kind==='input'?'proposals':null }];
    }
    if(c.expected_status==='needs_clarification'){value.status='needs_clarification';value.workflow=null;value.questions=['작업 목적 또는 충돌하는 조건을 확인해 주세요.'];}
    return {value,usage:null,response_id:null};
  }};
}
export async function evaluateSuite(raw:unknown, settings:{mode:'demo'|'live';repeat?:number;limits?:Partial<Limits>}, provider:(c:EvaluationCase)=>GenerationProvider, signal:AbortSignal, save:(row:EvaluationRow,record:GenerationRecord,summary:EvaluationSummary)=>Promise<void>) {
  const cases=SuiteSchema.parse(raw),repeat=z.number().int().min(1).max(5).parse(settings.repeat??1);
  const rows:EvaluationRow[]=[];
  const report=():EvaluationSummary=>({scoring_version:'2',mode:settings.mode,planned:cases.length*repeat,evaluated:rows.length,cancelled:signal.aborted,scope:settings.mode==='demo'?'고정 fixture를 사용한 평가 도구 동작 검사. 자연어 생성 성능 평가 아님.':'구조·명시 정책, 예상 응답 상태 및 지정된 선행 조건을 자동 평가. 절차 적절성은 사람 검토 필요.',rows:[...rows],metrics:metrics(rows)});
  for(const c of cases)for(let repetition=1;repetition<=repeat;repetition++){
    if(signal.aborted)return report();
    const p=provider(c);
    if((settings.mode==='demo')!==(p.mode==='demo'))throw new Error('EVALUATION_MODE_MISMATCH');
    const record=await generateWorkflow(c.input,p,settings.limits??{},signal);
    const row=score(c,record,repetition);rows.push(row);await save(row,record,report());
  }
  return report();
}
export function summaryMarkdown(r:EvaluationSummary):string {
  const percent=(v:number|null)=>v===null?'미측정':`${(v*100).toFixed(1)}%`;
  return `# Workflow 생성 평가 (${r.mode})\n\n${r.scope}\n\n평가 ${r.evaluated}/${r.planned}건 · 중단 ${r.cancelled?'예':'아니오'}\n비율 분모는 시도한 ${r.evaluated}건이며 API 실패도 포함합니다. 미시도 사례는 비율에서 제외합니다.\n\n- 구조 통과율: ${percent(r.metrics.structure_pass_rate)}\n- 최초 구조 통과율: ${percent(r.metrics.first_structure_pass_rate)}\n- 예상 상태 일치율: ${percent(r.metrics.expected_status_match_rate)}\n- 자동 기준 동시 통과율: ${percent(r.metrics.automatic_pass_rate)}\n- 모델 호출: ${r.metrics.model_calls} / 보정: ${r.metrics.repairs} / API 재시도: ${r.metrics.api_retries}\n- 선행 조건 검사 통과율: ${percent(r.metrics.prerequisites_pass_rate)} (검사 대상 ${r.metrics.prerequisites_evaluated}건)\n- 내용 품질 점수: 미평가\n\n| 사례 | 반복 | 예상 | 결과 | 자동 통과 | 보정 |\n|---|---:|---|---|---|---:|\n`+r.rows.map(x=>`| ${x.case_id} | ${x.repetition} | ${x.expected_status} | ${x.outcome} | ${x.automatic_passed?'예':'아니오'} | ${x.repairs} |`).join('\n')+'\n\n## 선행 조건 검사\n\n'+r.rows.map(x=>`### ${x.case_id} / ${x.repetition}\n\n`+(x.prerequisite_checks.length?x.prerequisite_checks.map(c=>`- ${c.passed?'통과':'미통과'}: ${c.rule}`).join('\n'):'검사 기준 미지정')).join('\n\n')+'\n\n## 사람 검토 항목\n\n'+r.rows.map(x=>`### ${x.case_id} / ${x.repetition}\n\n`+x.human_review.map(h=>`- [ ] ${h.criterion}`).join('\n')).join('\n\n')+'\n';
}
