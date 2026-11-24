import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executeDraft, type ExecutionRecord, type StepCall } from '../src/execution/run.js';
import { reviseExecution, ReviewEditError } from '../src/execution/revise.js';
import { sampleDraft, DEMO_REQUEST } from '../src/generator/demo.js';
const signal=()=>new AbortController().signal;
const answer=(p:any,reviewFail=false)=>JSON.stringify({outputs:Object.fromEntries(p.output_ports.map((x:any)=>[x.name,'보고서 내용'])),verdict:p.task.kind==='final_review'?(reviewFail?'needs_revision':'pass'):null,issues:p.task.kind==='final_review'&&reviewFail?['B 차별화 항목 누락']:[]});
async function pending(){return executeDraft({outcome:'draft',request:DEMO_REQUEST,response:sampleDraft()},{proposals:'원본 A/B/C',requirements:'첨부만'},async raw=>answer(JSON.parse(raw),true),signal(),{maxRevisions:0});}
test('보류 결과를 사용자 지시로 작성·검토만 재실행, 원본 보존',async()=>{
 const old=await pending(),before=JSON.stringify(old),calls:string[]=[];let last:ExecutionRecord|undefined;
 const result=await reviseExecution(old,'B의 특징을 반영하고 판단 유보를 유지해.',async raw=>{
  const p=JSON.parse(raw);calls.push(p.node.id);
  assert.ok(p.intent.requirements.includes('사용자 수정 지시: B의 특징을 반영하고 판단 유보를 유지해.'));
  assert.match(p.inputs.original_inputs,/원본 A\/B\/C/);assert.match(p.inputs.previous_draft,/보고서 내용/);
  assert.match(p.inputs.review_feedback,/B 차별화 항목 누락/);return answer(p);
 },signal(),{},{checkpoint:async r=>{last=r;}});
 assert.deepEqual(calls,['rewrite','review']);assert.equal(result.status,'completed');assert.equal(result.revised_from,old.id);
 assert.equal(result.user_feedback,'B의 특징을 반영하고 판단 유보를 유지해.');assert.deepEqual(last,result);assert.equal(JSON.stringify(old),before);assert.notEqual(result.id,old.id);
});
test('사용자 수정 후에도 미해결이면 완료 처리하지 않음',async()=>{
 const r=await reviseExecution(await pending(),'누락 항목 추가',async raw=>answer(JSON.parse(raw),true),signal(),{maxRevisions:0});
 assert.equal(r.status,'needs_review');assert.deepEqual(r.output,{});
});
test('빈 피드백·과대 피드백·잘못된 상태·스냅샷 없는 기록은 호출 전에 거부',async()=>{
 const old=await pending();let calls=0;const call:StepCall=async()=>{calls++;return '';};
 for(const [record,feedback] of [[old,' '],[old,'가'.repeat(2001)],[{...old,status:'completed'},'수정'],[{...old,snapshot:undefined},'수정']] as const)
  await assert.rejects(reviseExecution(record,feedback,call,signal()),ReviewEditError);
 assert.equal(calls,0);
});
test('손상된 과거 결과는 새 수정 호출 전에 거부',async()=>{
 const old=await pending();old.steps[0]!.outputs={bad:'x'};let calls=0;
 await assert.rejects(reviseExecution(old,'수정',async()=>{calls++;return '';},signal()),ReviewEditError);assert.equal(calls,0);
});
test('사용자 수정 중 취소는 완료 산출물 없이 종료',async()=>{
 const old=await pending(),abort=new AbortController();let calls=0;
 const r=await reviseExecution(old,'수정',async raw=>{calls++;abort.abort();return answer(JSON.parse(raw));},abort.signal);
 assert.equal(r.status,'cancelled');assert.equal(calls,1);assert.deepEqual(r.output,{});
});
