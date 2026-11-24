import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import definition from '../workflows/content-review.json' with { type: 'json' };
import { runWorkflow, approveWorkflow, resumeWorkflow, rerunWorkflow } from '../src/workflow/runner.js';
import { demoExecutor } from '../src/workflow/executors.js';
import { SqliteWorkflowStore } from '../src/workflow/sqlite-store.js';
import { RunRecordSchema } from '../src/workflow/records.js';
import { exportRun } from '../src/workflow/artifacts.js';
import { createService } from '../src/ipc/service.js';
import type { Message } from '../src/ipc/protocol.js';
for (const k of ['LANGSMITH_TRACING_V2','LANGCHAIN_TRACING_V2','LANGSMITH_TRACING','LANGCHAIN_TRACING']) process.env[k]='';
const req=(requestId:string,method:string,params:unknown)=>JSON.stringify({protocolVersion:1,requestId,method,params});

test('승인 앞에서 중단: 미호출·Attention 저장·DB 재접속 후 동일 상태',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'approval-'));let store=new SqliteWorkflowStore(join(dir,'runs.sqlite'));
 t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true});});const calls:string[]=[];
 const run=await runWorkflow(definition,'목표',async i=>{calls.push(i.step.id);return demoExecutor(i);},undefined,{store,mode:'demo'});
 assert.equal(run.status,'Attention');assert.deepEqual(calls,['plan','draft']);
 assert.deepEqual(run.steps.map(s=>s.status),['Completed','Completed','Attention']);assert.equal(run.steps[2]!.toolTrace,undefined);
 store.close();store=new SqliteWorkflowStore(join(dir,'runs.sqlite'));assert.deepEqual(store.get(run.runId),run);
 const report=readFileSync(exportRun(run,join(dir,'exports')).reportPath,'utf8');assert.match(report,/승인 대기 중인 부분 결과/);
});

test('승인하면 검토만 실행하고 새 실행의 승인 기록·trace와 원본을 보존',async t=>{
 const store=new SqliteWorkflowStore(':memory:');t.after(()=>store.close());
 const paused=await runWorkflow(definition,'목표',demoExecutor,undefined,{store,mode:'demo'});const calls:string[]=[];
 const done=await approveWorkflow(paused.runId,'review',async i=>{calls.push(i.step.id);return demoExecutor(i);},undefined,{store,mode:'demo'});
 assert.deepEqual(calls,['review']);assert.equal(done.status,'Completed');assert.equal(done.parentRunId,paused.runId);
 assert.equal(done.approval!.stepId,'review');assert.ok(done.approval!.approvedAt);assert.deepEqual(done.approvedSteps,['review']);
 assert.deepEqual(done.steps.slice(0,2),paused.steps.slice(0,2));assert.equal(done.steps[2]!.toolTrace!.tools.length,1);
 assert.deepEqual(store.get(paused.runId),paused);assert.deepEqual(store.get(done.runId),done);
});

test('승인 지점이 여러 개면 한 번 승인으로 다음 승인 지점까지 통과하지 않음',async t=>{
 const store=new SqliteWorkflowStore(':memory:');t.after(()=>store.close());const spec=structuredClone(definition);
 spec.steps[1]!.reviewBefore=true;
 const first=await runWorkflow(spec,'목표',demoExecutor,undefined,{store,mode:'demo'});
 assert.deepEqual(first.steps.map(s=>s.status),['Completed','Attention','Pending']);
 const second=await approveWorkflow(first.runId,'draft',demoExecutor,undefined,{store,mode:'demo'});
 assert.equal(second.status,'Attention');assert.equal(second.steps[2]!.status,'Attention');assert.deepEqual(second.approvedSteps,['draft']);
 const third=await approveWorkflow(second.runId,'review',demoExecutor,undefined,{store,mode:'demo'});
 assert.equal(third.status,'Completed');assert.deepEqual(third.approvedSteps,['draft','review']);
});

test('resume은 승인 우회 불가, 초안 재실행 시 하위 승인 해제',async t=>{
 const store=new SqliteWorkflowStore(':memory:');t.after(()=>store.close());const paused=await runWorkflow(definition,'목표',demoExecutor,undefined,{store,mode:'demo'});
 await assert.rejects(resumeWorkflow(paused.runId,demoExecutor,undefined,{store,mode:'demo',recoverInterrupted:true}),/승인/);
 const done=await approveWorkflow(paused.runId,'review',demoExecutor,undefined,{store,mode:'demo'});
 const rerun=await rerunWorkflow(done.runId,'draft',demoExecutor,undefined,{store,mode:'demo'});
 assert.equal(rerun.status,'Attention');assert.equal(rerun.approvedSteps,undefined);assert.equal(rerun.steps[2]!.toolTrace,undefined);
 assert.ok(!rerun.events.some(e=>e.stepId==='review'&&e.status==='Running'));
});

test('승인 후 단계 실패는 같은 입력의 resume에서 승인과 선행 결과 유지',async t=>{
 const store=new SqliteWorkflowStore(':memory:');t.after(()=>store.close());const paused=await runWorkflow(definition,'목표',demoExecutor,undefined,{store,mode:'demo'});
 const failed=await approveWorkflow(paused.runId,'review',async()=>({ok:false,error:'모델 실패'}),undefined,{store,mode:'demo'});
 assert.equal(failed.status,'Failed');const resumed=await resumeWorkflow(failed.runId,demoExecutor,undefined,{store,mode:'demo'});
 assert.equal(resumed.status,'Completed');assert.deepEqual(resumed.approvedSteps,['review']);assert.deepEqual(resumed.steps[0],paused.steps[0]);
});

test('잘못된 승인 대상·모드·기록 위조는 호출 없이 거부',async t=>{
 const store=new SqliteWorkflowStore(':memory:');t.after(()=>store.close());const paused=await runWorkflow(definition,'목표',demoExecutor,undefined,{store,mode:'demo'});
 let calls=0;const execute=async()=>{calls++;return {ok:true as const,text:'결과'};};
 await assert.rejects(approveWorkflow(paused.runId,'draft',execute,undefined,{store,mode:'demo'}),/일치/);
 await assert.rejects(approveWorkflow(paused.runId,'review',execute,undefined,{store,mode:'live'}),/모드/);
 const bad=structuredClone(paused);bad.steps[2]!.status='Completed';bad.steps[2]!.output='위조';bad.status='Completed';
 assert.equal(RunRecordSchema.safeParse(bad).success,false);
 assert.equal(calls,0);assert.equal(store.list().length,1);
});

test('Sidecar 승인 요청과 중복 차단: 승인 전후의 상태 이벤트 연결',async t=>{
 const store=new SqliteWorkflowStore(':memory:');t.after(()=>store.close());const messages:Message[]=[];const handle=createService(store,m=>messages.push(m));
 await handle(req('start','run.start',{workflow:definition,goal:'목표',mode:'demo'}));
 const first=messages.at(-1)!;assert.ok(first.type==='response'&&first.ok);
 const paused=RunRecordSchema.parse((first.data as {run:unknown}).run);assert.equal(paused.status,'Attention');
 messages.length=0;const line=req('approve','run.approve',{runId:paused.runId,stepId:'review',mode:'demo'});
 await handle(line);const last=messages.at(-1)!;assert.ok(last.type==='response'&&last.ok);
 assert.equal(RunRecordSchema.parse((last.data as {run:unknown}).run).status,'Completed');
 assert.ok(messages.filter(m=>m.type==='event').every(m=>m.stepId==='review'&&m.requestId==='approve'));
 await handle(line);const duplicate=messages.at(-1)!;assert.ok(duplicate.type==='response'&&!duplicate.ok);assert.equal(duplicate.error.code,'DUPLICATE_REQUEST');
 assert.equal(store.list().length,2);
});

test('CLI는 승인 대기에서 정상 종료하고 별도 프로세스 승인으로 완료',t=>{
 const dir=mkdtempSync(join(tmpdir(),'approval-cli-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const cli=(...args:string[])=>spawnSync(process.execPath,['--import','tsx','src/workflow/cli.ts',...args],{
  cwd:fileURLToPath(new URL('../',import.meta.url)),env:{PATH:process.env.PATH,AGENT_RUNTIME_DB:join(dir,'runs.sqlite')},encoding:'utf8',timeout:15000});
 const first=cli('--demo','--with-review','캡스톤 초안');assert.equal(first.status,0,first.stderr);assert.match(first.stdout,/워크플로: Attention/);
 assert.ok(!first.stderr.includes('[Running] review'));const id=/실행 ID: ([\da-f-]+)/.exec(first.stdout)![1]!;
 const second=cli('--demo','--approve',id,'review');assert.equal(second.status,0,second.stderr);assert.match(second.stdout,/워크플로: Completed/);
 assert.match(second.stdout,/승인 기록: review/);assert.ok(!second.stderr.includes('[Running] draft'));
});
