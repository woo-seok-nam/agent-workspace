import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SuiteSchema, evaluateSuite, fixtureProvider, metrics, score, summaryMarkdown } from '../src/evaluation/generator.js';
import { generateWorkflow } from '../src/generator/generate.js';
import { readFile } from 'node:fs/promises';
const cases=SuiteSchema.parse(JSON.parse(await readFile('examples/generator/evaluation-cases.json','utf8')));
const sig=()=>new AbortController().signal;
test('5개 사례 반복 평가, 고정 예시 모드 표시, 사람 점수 미평가',async()=>{
 const saved:string[]=[];
 const r=await evaluateSuite(cases,{mode:'demo',repeat:2},fixtureProvider,sig(),async row=>{saved.push(row.case_id);});
 assert.equal(r.planned,10);assert.equal(r.evaluated,10);assert.equal(r.metrics.automatic_pass_rate,1);assert.equal(r.metrics.human_quality_score,null);assert.equal(saved.length,10);
 assert.match(summaryMarkdown(r),/자연어 생성 성능 평가 아님/);assert.ok(r.rows.every(row=>row.human_review.every(h=>h.status==='pending')));
});
test('구조 통과와 예상 상태 일치는 독립적으로 채점',async()=>{
 const c=cases[0]!;const r=await generateWorkflow(c.input,fixtureProvider(c));
 const row=score({...c,expected_status:'needs_clarification'},r,1);
 assert.equal(row.structure_passed,true);assert.equal(row.expected_status_matched,false);assert.equal(row.automatic_passed,false);
});
test('API 실패는 분모에 포함하며 정상 초안으로 채점하지 않음',async()=>{
 const c=cases[0]!;const record=await generateWorkflow(c.input,{model:'fake',mode:'test',async generate(){throw new Error();}},{maxApiRetries:0});
 const r=metrics([score(c,record,1)]);assert.equal(r.failed_count,1);assert.equal(r.automatic_pass_rate,0);assert.equal(r.structure_pass_rate,0);
 assert.equal(metrics([]).automatic_pass_rate,null);
});
test('평가 중 취소하면 완료 기록 저장 후 다음 사례 호출 중단',async()=>{
 const a=new AbortController();let saved=0;
 const r=await evaluateSuite(cases,{mode:'demo'},fixtureProvider,a.signal,async()=>{saved++;a.abort();});
 assert.equal(saved,1);assert.equal(r.evaluated,1);assert.equal(r.planned,5);assert.equal(r.cancelled,true);
});
test('중복 사례·과도한 반복과 모드 불일치 거부',async()=>{
 assert.equal(SuiteSchema.safeParse([cases[0],cases[0]]).success,false);
 await assert.rejects(evaluateSuite(cases,{mode:'demo',repeat:6},fixtureProvider,sig(),async()=>{}));
 await assert.rejects(evaluateSuite(cases,{mode:'live'},fixtureProvider,sig(),async()=>{}),/MODE_MISMATCH/);
});
test('저장 실패 이후 사례 호출 없음',async()=>{
 let called=0;
 await assert.rejects(evaluateSuite(cases,{mode:'demo'},c=>{called++;return fixtureProvider(c);},sig(),async()=>{throw new Error('disk');}),/disk/);
 assert.equal(called,1);
});
test('구조와 상태가 맞아도 필수 도구 선행 조건 누락은 미통과',async()=>{
 const c=cases.find(c=>c.id==='missing_tool')!;
 const r=await generateWorkflow(c.input,fixtureProvider(c));
 for(const n of r.response!.workflow!.nodes) if(n.task)n.task.prerequisites=[];
 const row=score(c,r,1);
 assert.equal(row.structure_passed,true);assert.equal(row.expected_status_matched,true);
 assert.equal(row.prerequisites_passed,false);assert.equal(row.automatic_passed,false);
});
test('자료 입력형과 사람 수집형 모두 자료 부족 사례의 대안으로 허용',async()=>{
 const c=cases.find(c=>c.id==='missing_material')!;
 const r=await generateWorkflow(c.input,fixtureProvider(c));
 assert.equal(score(c,r,1).prerequisites_passed,true);
 const task=r.response!.workflow!.nodes.find(n=>n.task)!.task!;
 task.prerequisites=[{kind:'human',description:'실제 인터뷰 수집',input_port:null}];
 assert.equal(score(c,r,1).prerequisites_passed,true);
});
test('텍스트 비교에 불필요한 도구 요구 또는 미분류 제약은 미통과',async()=>{
 const c=cases.find(c=>c.id==='clear')!;
 const r=await generateWorkflow(c.input,fixtureProvider(c));
 const task=r.response!.workflow!.nodes.find(n=>n.task)!.task!;
 task.prerequisites.push({kind:'tool',description:'불필요한 도구',input_port:null});
 assert.equal(score(c,r,1).prerequisites_passed,false);
 task.prerequisites=task.prerequisites.filter(p=>p.kind==='input');
 task.missing_capabilities=['단순 범위 한계를 잘못 차단 조건으로 분류'];
 assert.equal(score(c,r,1).automatic_passed,false);
});
test('기준 미지정은 미평가이며 API 실패는 조건 검사 분모에 포함',async()=>{
 const c=cases[0]!;
 const failed=await generateWorkflow(c.input,{model:'fake',mode:'test',async generate(){throw Error();}},{maxApiRetries:0});
 const withRules=score(c,failed,1);
 const {prerequisite_checks:_,...legacy}=c;
 const withoutRules=score(legacy,failed,1);
 assert.equal(withRules.prerequisites_passed,false);assert.equal(withoutRules.prerequisites_passed,null);
 const m=metrics([withRules,withoutRules]);assert.equal(m.prerequisites_evaluated,1);assert.equal(m.prerequisites_pass_rate,0);
 assert.equal(metrics([withoutRules]).prerequisites_pass_rate,null);
});
