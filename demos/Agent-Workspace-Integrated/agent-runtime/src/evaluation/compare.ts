import { z } from 'zod';
const rowSchema = z.object({
  case_id: z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/), repetition: z.number().int().min(1).max(5),
  case_fingerprint: z.string().regex(/^[a-f0-9]{64}$/), automatic_passed: z.boolean(),
  duration_ms: z.number().finite().nonnegative(), model_calls: z.number().int().nonnegative(),
  repairs: z.number().int().nonnegative(), model: z.string(), prompt_version: z.string(),
});
const reportSchema = z.object({
  scoring_version: z.literal('2'), mode: z.enum(['demo','live']), cancelled: z.literal(false),
  planned: z.number().int().min(1).max(100), evaluated: z.number().int().min(1).max(100),
  rows: z.array(rowSchema).min(1).max(100),
}).superRefine((r,ctx)=>{
  const keys = r.rows.map(x=>`${x.case_id}:${x.repetition}`);
  if(r.planned!==r.evaluated || r.evaluated!==r.rows.length || new Set(keys).size!==keys.length)
    ctx.addIssue({code:'custom',message:'완료된 평가와 고유한 사례·반복 번호가 필요합니다.'});
});
export class ComparisonError extends Error {}
export function compareReports(before: unknown, after: unknown) {
  const a=reportSchema.safeParse(before), b=reportSchema.safeParse(after);
  if(!a.success || !b.success) throw new ComparisonError('v0.27.0 이후의 중단되지 않은 전체 report.json 두 개가 필요합니다. 이전 형식·누락·중복 기록은 비교할 수 없습니다.');
  if(a.data.mode!==b.data.mode) throw new ComparisonError('DEMO와 LIVE 결과는 직접 비교할 수 없습니다.');
  const old=new Map(a.data.rows.map(r=>[`${r.case_id}:${r.repetition}`,r]));
  if(old.size!==b.data.rows.length) throw new ComparisonError('사례 구성과 반복 횟수가 다릅니다. 같은 조건으로 평가하세요.');
  const rows=b.data.rows.map(next=>{
    const prior=old.get(`${next.case_id}:${next.repetition}`);
    if(!prior || prior.case_fingerprint!==next.case_fingerprint) throw new ComparisonError('요청·평가 기준 또는 사례 구성이 달라 직접 비교할 수 없습니다.');
    return {case_id:next.case_id,repetition:next.repetition,
      change:prior.automatic_passed===next.automatic_passed?'unchanged':next.automatic_passed?'improved':'regressed',
      before_passed:prior.automatic_passed,after_passed:next.automatic_passed,
      duration_delta_ms:next.duration_ms-prior.duration_ms,model_calls_delta:next.model_calls-prior.model_calls,repairs_delta:next.repairs-prior.repairs,
      before_model:prior.model,after_model:next.model,before_prompt:prior.prompt_version,after_prompt:next.prompt_version};
  });
  const rate=(data:typeof a.data)=>data.rows.filter(r=>r.automatic_passed).length/data.rows.length;
  return {mode:a.data.mode,compared:rows.length,before_pass_rate:rate(a.data),after_pass_rate:rate(b.data),
    delta_percentage_points:(rate(b.data)-rate(a.data))*100,
    improved:rows.filter(r=>r.change==='improved').length,regressed:rows.filter(r=>r.change==='regressed').length,rows};
}
export function comparisonMarkdown(r:ReturnType<typeof compareReports>):string {
  const labels={improved:'개선',regressed:'악화',unchanged:'동일'};
  return `# 생성 평가 비교 (${r.mode})\n\n같은 요청·평가 기준·반복 번호의 ${r.compared}건을 비교했습니다. 내용 품질이나 통계적 유의성을 판정하지 않습니다. 모델·프롬프트 변경과 실행 환경 차이도 확인하세요.\n\n${r.mode==='demo'?'고정 fixture 비교이며 실제 모델 성능 비교가 아닙니다.\n\n':''}자동 통과율: ${(r.before_pass_rate*100).toFixed(1)}% → ${(r.after_pass_rate*100).toFixed(1)}% (${r.delta_percentage_points.toFixed(1)}%p)\n개선 ${r.improved}건 / 악화 ${r.regressed}건\n\n| 사례 | 반복 | 이전 | 이후 | 변화 | 시간 차이(ms) | 호출 차이 | 보정 차이 |\n|---|---:|---|---|---|---:|---:|---:|\n`+r.rows.map(x=>`| ${x.case_id} | ${x.repetition} | ${x.before_passed?'통과':'미통과'} | ${x.after_passed?'통과':'미통과'} | ${labels[x.change as keyof typeof labels]} | ${x.duration_delta_ms} | ${x.model_calls_delta} | ${x.repairs_delta} |`).join('\n')+'\n\n모델·프롬프트 정보는 comparison.json에 저장됩니다. 차이는 모두 이후−이전입니다.\n';
}
