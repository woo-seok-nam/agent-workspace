import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SuiteSchema,evaluateSuite,fixtureProvider,caseFingerprint} from '../src/evaluation/generator.js';
import {compareReports,comparisonMarkdown} from '../src/evaluation/compare.js';
const cases=SuiteSchema.parse(JSON.parse(await readFile('examples/generator/evaluation-cases.json','utf8')));
const base=await evaluateSuite(cases,{mode:'demo'},fixtureProvider,new AbortController().signal,async()=>{});
test('동일 평가 비교는 변화 없으며 DEMO 한계를 명시',()=>{
 const r=compareReports(base,base);assert.equal(r.improved,0);assert.equal(r.regressed,0);assert.equal(r.delta_percentage_points,0);
 assert.match(comparisonMarkdown(r),/실제 모델 성능 비교가 아닙니다/);
});
test('집계값을 신뢰하지 않고 사례별 개선·악화와 비용 차이를 계산',()=>{
 const before=structuredClone(base),after=structuredClone(base);
 before.rows[0]!.automatic_passed=false;after.rows[1]!.automatic_passed=false;
 after.rows[0]!.duration_ms+=10;after.rows[0]!.model_calls+=1;
 const r=compareReports(before,after);assert.equal(r.improved,1);assert.equal(r.regressed,1);assert.equal(r.delta_percentage_points,0);
 assert.equal(r.rows[0]!.duration_delta_ms,10);assert.equal(r.rows[0]!.model_calls_delta,1);
});
test('요청 또는 기준 변경은 지문이 달라지고 비교를 거부',()=>{
 for(const mutate of [(c:typeof cases[number])=>{c.input.request+='추가 요청';},(c:typeof cases[number])=>{c.review.push('추가 기준');}]){
 const changed=structuredClone(cases[0]!);mutate(changed);
 assert.notEqual(caseFingerprint(changed),caseFingerprint(cases[0]!));
 const after=structuredClone(base);after.rows[0]!.case_fingerprint=caseFingerprint(changed);
 assert.throws(()=>compareReports(base,after),/달라/);
 }
});
test('과거 형식·중단·중복·표본 변경·모드 혼합은 비교 거부',()=>{
 const old:Record<string,unknown>={...base};delete old.scoring_version;assert.throws(()=>compareReports(old,base));
 assert.throws(()=>compareReports({...base,cancelled:true},base));
 const dup=structuredClone(base);dup.rows[1]=dup.rows[0]!;assert.throws(()=>compareReports(base,dup));
 assert.throws(()=>compareReports(base,{...base,mode:'live'}));
 const small=structuredClone(base);small.rows.pop();small.planned--;small.evaluated--;assert.throws(()=>compareReports(base,small));
});
test('행 순서와 객체 키 순서는 비교 결과를 바꾸지 않는다',()=>{
 const after=structuredClone(base);after.rows.reverse();assert.equal(compareReports(base,after).delta_percentage_points,0);
 const c=cases[0]!;assert.equal(caseFingerprint(c),caseFingerprint({...c,input:{...c.input,request:c.input.request}}));
});
