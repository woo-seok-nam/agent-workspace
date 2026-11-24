import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executeDraft, type ExecutionRecord, type StepCall } from '../src/execution/run.js';
import { resumeExecution, ResumeError } from '../src/execution/resume.js';
import { sampleDraft, DEMO_REQUEST } from '../src/generator/demo.js';
const saved=()=>({outcome:'draft',request:DEMO_REQUEST,response:sampleDraft()});
const inputs={proposals:'원본 자료',requirements:'첨부만'};
const sig=()=>new AbortController().signal;
const model: StepCall=async raw=>{
 const p=JSON.parse(raw);return JSON.stringify({outputs:Object.fromEntries(p.output_ports.map((x:any)=>[x.name,p.node.id+' 결과'])),verdict:p.task.kind==='final_review'?'pass':null,issues:[]});
};
async function interrupted() {
 let i=0;return executeDraft(saved(),inputs,async(raw,s,sc)=>{if(i++===2)throw new Error();return model(raw,s,sc);},sig());
}
test('중단 전 2개 결과 재사용, 남은 3개만 호출하고 원본 기록 불변',async()=>{
 const old=await interrupted(), before=JSON.stringify(old);const called:string[]=[];let last:ExecutionRecord|undefined;
 const r=await resumeExecution(old,async(raw,s,sc)=>{called.push(JSON.parse(raw).node.id);return model(raw,s,sc);},sig(),{checkpoint:async v=>{last=v;}});
 assert.equal(r.status,'completed');assert.deepEqual(called,['recommend','write','review']);assert.equal(r.reused_steps,2);assert.equal(r.resumed_from,old.id);assert.notEqual(r.id,old.id);assert.equal(JSON.stringify(old),before);assert.deepEqual(last,r);
});
test('원본 파일 재열람 없이 저장된 입력을 사용',async()=>{
 const old=await interrupted();
 await resumeExecution(old,async(raw,s,sc)=>{const p=JSON.parse(raw);if(p.task.kind==='final_review')assert.equal(p.inputs.source,'원본 자료');return model(raw,s,sc);},sig());
});
test('수정 도중 중단된 기록은 검토 의견과 기존 수정 한도 복원',async()=>{
 let old=await executeDraft(saved(),inputs,async(raw,s,sc)=>{
  const p=JSON.parse(raw);if(p.revision)throw new Error();const a=JSON.parse(await model(raw,s,sc));if(p.task.kind==='final_review'){a.verdict='needs_revision';a.issues=['원본 반영'];}return JSON.stringify(a);
 },sig(),{maxRevisions:1});
 let calls=0;
 const r=await resumeExecution(old,async(raw,s,sc)=>{calls++;const p=JSON.parse(raw);if(p.revision)assert.deepEqual(p.revision.issues,['원본 반영']);const a=JSON.parse(await model(raw,s,sc));if(p.task.kind==='final_review'){a.verdict='needs_revision';a.issues=['아직 문제'];}return JSON.stringify(a);},sig());
 assert.equal(calls,2);assert.equal(r.status,'needs_review');assert.equal(r.revisions,1);assert.equal(r.reused_steps,5);
});
test('단계 순서 또는 출력 포트가 잘못된 기록은 새 API 호출 전에 거부',async()=>{
 for(const edit of [(r:ExecutionRecord)=>{r.steps.reverse();},(r:ExecutionRecord)=>{r.steps[1]!.outputs={wrong:'x'};}]){
  const old=await interrupted();edit(old);let calls=0;
  await assert.rejects(resumeExecution(old,async()=>{calls++;return '';},sig()),ResumeError);assert.equal(calls,0);
 }
});
test('이전 버전 스냅샷 없는 기록과 completed/needs_review는 재개 거부',async()=>{
 const old=await interrupted();
 for(const candidate of [{...old,snapshot:undefined},{...old,status:'completed'},{...old,status:'needs_review'}])await assert.rejects(resumeExecution(candidate,model,sig()),ResumeError);
});
test('마지막 검토 직후 강제 종료 기록은 호출 없이 출력 복원',async()=>{
 let checkpoint:ExecutionRecord|undefined;
 await executeDraft(saved(),inputs,model,sig(),{},{checkpoint:async r=>{if(r.status==='running'&&r.steps.length===5)checkpoint=r;}});
 let calls=0;const r=await resumeExecution(checkpoint,async()=>{calls++;return '';},sig());
 assert.equal(r.status,'completed');assert.equal(calls,0);assert.equal(r.output.report,'review 결과');
});
test('재개 취소는 추가 호출 없이 cancelled 저장',async()=>{
 const old=await interrupted(), abort=new AbortController();abort.abort();let last:ExecutionRecord|undefined;let calls=0;
 const r=await resumeExecution(old,async()=>{calls++;return '';},abort.signal,{checkpoint:async s=>{last=s;}});
 assert.equal(r.status,'cancelled');assert.equal(last?.status,'cancelled');assert.equal(calls,0);
});
