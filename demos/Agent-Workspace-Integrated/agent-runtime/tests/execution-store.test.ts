import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, readdir, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { executeDraft, type ExecutionRecord, type StepCall } from '../src/execution/run.js';
import { atomicWrite, ExecutionSaveError } from '../src/execution/store.js';
import { pendingArtifacts } from '../src/execution/report.js';
import { sampleDraft, DEMO_REQUEST } from '../src/generator/demo.js';
const saved = () => ({ outcome: 'draft', request: DEMO_REQUEST, response: sampleDraft() });
const inputs = { proposals: 'A/B/C 자료', requirements: '자료만 사용' };
const call: StepCall = async raw => {
  const p = JSON.parse(raw); return JSON.stringify({ outputs: Object.fromEntries(p.output_ports.map((x: any) => [x.name, p.node.id+' 결과'])), verdict: p.task.kind === 'final_review' ? 'pass' : null, issues: [] });
};
test('호출 전 running 기록, 단계별 결과와 최종 상태를 순서대로 저장', async () => {
  const snapshots: ExecutionRecord[] = [];
  const result = await executeDraft(saved(), inputs, async (raw, sig) => {
    assert.equal(snapshots.at(-1)?.status, 'running');
    assert.equal(snapshots.at(-1)?.current_node, JSON.parse(raw).node.id);
    return call(raw, sig);
  }, new AbortController().signal, {}, { checkpoint: async r => { snapshots.push(r); } });
  assert.equal(snapshots[0]?.steps.length, 0);
  for (let n=1;n<=5;n++) assert.ok(snapshots.some(s => s.steps.length === n));
  assert.equal(snapshots.at(-1)?.status, 'completed'); assert.deepEqual(snapshots.at(-1), result);
  assert.equal(snapshots[0]?.steps.length, 0); // later mutations cannot alter earlier snapshots
});
test('모델 실패 시 이미 완료한 단계와 failed 상태 보존', async () => {
  let count=0; let last: ExecutionRecord | undefined;
  const result = await executeDraft(saved(), inputs, async (raw, sig) => { if(count++)throw new Error(); return call(raw,sig); }, new AbortController().signal, {}, {checkpoint:async r=>{last=r;}});
  assert.equal(result.status,'failed'); assert.equal(last?.steps.length,1); assert.equal(last?.current_node,'compare');
});
test('초기 저장 실패 시 AI 호출하지 않음', async () => {
  let calls=0;
  await assert.rejects(executeDraft(saved(), inputs, async()=>{calls++;return '';},new AbortController().signal,{}, {checkpoint:async()=>{throw new Error('disk');}}),ExecutionSaveError);
  assert.equal(calls,0);
});
test('완료 단계 저장 실패 시 다음 AI 작업 호출하지 않음', async () => {
  let calls=0;
  await assert.rejects(executeDraft(saved(), inputs, async(raw,sig)=>{calls++;return call(raw,sig);},new AbortController().signal,{}, {checkpoint:async r=>{if(r.steps.length)throw new Error('disk');}}),ExecutionSaveError);
  assert.equal(calls,1);
});
test('검토 보류 시 최신 초안·의견을 분리하고 최종 보고서로 표시하지 않음', async () => {
  let last: ExecutionRecord | undefined;
  const r=await executeDraft(saved(), inputs, async(raw,sig)=>{
    const a=JSON.parse(await call(raw,sig));if(JSON.parse(raw).task.kind==='final_review'){a.verdict='needs_revision';a.issues=['근거 보완'];}return JSON.stringify(a);
  },new AbortController().signal,{maxRevisions:0},{checkpoint:async s=>{last=s;}});
  assert.equal(last?.status,'needs_review');
  const files=pendingArtifacts(r);assert.match(files.draft!,/최종 승인되지 않음/);assert.match(files.draft!,/write 결과/);assert.match(files.review!,/근거 보완/);
  r.status='completed';assert.deepEqual(pendingArtifacts(r),{draft:null,review:null});
});
test('atomicWrite는 교체 후 유효 JSON만 남기고 임시파일 정리', async()=>{
  const dir=await mkdtemp(join(tmpdir(),'capdi-store-'));
  try{
    const path=join(dir,'execution.json');await atomicWrite(path,'{"steps":[]}');await atomicWrite(path,'{"steps":[1]}');
    assert.deepEqual(JSON.parse(await readFile(path,'utf8')),{steps:[1]});assert.deepEqual(await readdir(dir),['execution.json']);
    const blocked=join(dir,'blocked');await mkdir(blocked);await writeFile(join(blocked,'keep'),'existing');
    await assert.rejects(atomicWrite(blocked,'x'),ExecutionSaveError);
    assert.equal(await readFile(join(blocked,'keep'),'utf8'),'existing');assert.ok(!(await readdir(dir)).some(f=>f.endsWith('.tmp')));
  }finally{await rm(dir,{recursive:true,force:true});}
});
