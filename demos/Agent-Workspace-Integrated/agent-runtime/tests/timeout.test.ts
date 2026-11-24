import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import definition from '../workflows/content-tools.json' with { type: 'json' };
import { WorkflowSchema, type StepInput } from '../src/workflow/schema.js';
import { runWorkflow, resumeWorkflow, approveWorkflow } from '../src/workflow/runner.js';
import { demoExecutor, liveExecutor } from '../src/workflow/executors.js';
import { executeStep } from '../src/workflow/step-execution.js';
import { SqliteWorkflowStore } from '../src/workflow/sqlite-store.js';
import { RunRecordSchema } from '../src/workflow/records.js';
import { exportRun } from '../src/workflow/artifacts.js';
import { createService } from '../src/ipc/service.js';
import type { Message } from '../src/ipc/protocol.js';
import type { Transport } from '../src/providers/http.js';
for (const k of ['LANGSMITH_TRACING_V2','LANGCHAIN_TRACING_V2','LANGSMITH_TRACING','LANGCHAIN_TRACING']) process.env[k]='';
const env={OPENAI_API_KEY:'fake',OPENAI_MODEL:'fake',GEMINI_API_KEY:'fake',GEMINI_MODEL:'fake'};
const timed=(id='draft')=>({...definition,steps:definition.steps.map(s=>s.id===id?{...s,timeoutMs:100}:s)});
const req=(requestId:string,method:string,params:unknown)=>JSON.stringify({protocolVersion:1,requestId,method,params});
const neverRespond:Transport=async(_url,init)=>new Promise<Response>((_resolve,reject)=>{
 const signal=init!.signal!;if(signal.aborted)reject(signal.reason);
 else signal.addEventListener('abort',()=>reject(signal.reason),{once:true});
});

test('timeoutMs는 선택 사항이며 정수 100~300000만 허용, 잘못된 설정은 미실행',async()=>{
 assert.equal(WorkflowSchema.safeParse(definition).success,true);
 for(const timeoutMs of [100,300000])assert.equal(WorkflowSchema.safeParse({...definition,steps:[{...definition.steps[0],timeoutMs}]}).success,true);
 let calls=0;
 for(const timeoutMs of [0,99,-1,300001,100.5,'100',null,Infinity]){
  await assert.rejects(runWorkflow({...definition,steps:[{...definition.steps[0],timeoutMs}]},'목표',async()=>{calls++;return {ok:true,text:'호출 금지'};}),/정의 오류/);
 }
 assert.equal(calls,0);
});

for(const provider of ['openai','gemini'])test(`${provider}: 단계 시간 초과는 HTTP 중단·후속 단계 차단·STEP_TIMEOUT 저장`,{timeout:5000},async t=>{
 const store=new SqliteWorkflowStore(':memory:');t.after(()=>store.close());let signal:AbortSignal|undefined,calls=0;
 const transport:Transport=async(...args)=>{calls++;signal=args[1]!.signal!;return neverRespond(...args);};
 const workflow=timed('plan');workflow.steps=workflow.steps.map(s=>({...s,provider}));
 const run=await runWorkflow(workflow,'목표',liveExecutor({env,transport}),undefined,{store,mode:'live'});
 assert.equal(run.status,'Failed');assert.equal(run.steps[0]!.errorCode,'STEP_TIMEOUT');assert.match(run.steps[0]!.error!,/100ms/);
 assert.deepEqual(run.steps.map(s=>s.status),['Failed','Skipped','Skipped']);assert.equal(calls,1);assert.equal(signal?.aborted,true);
 assert.deepEqual(store.get(run.runId),run);
});

test('시간 초과 뒤 DB 재접속·선행 결과 보존·같은 Snapshot 재개·오류 코드 내보내기',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'step-timeout-')),path=join(dir,'runs.sqlite');let store=new SqliteWorkflowStore(path);
 t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true});});
 const failed=await runWorkflow(timed(),'목표',async input=>{
  if(input.step.id==='draft')await delay(5000,undefined,{signal:input.signal});return demoExecutor(input);
 },undefined,{store,mode:'demo'});
 assert.deepEqual(failed.steps.map(s=>s.status),['Completed','Failed','Skipped']);
 store.close();store=new SqliteWorkflowStore(path);assert.deepEqual(store.get(failed.runId),failed);
 const calls:string[]=[];const resumed=await resumeWorkflow(failed.runId,async input=>{calls.push(input.step.id);return demoExecutor(input);},undefined,{store,mode:'demo'});
 assert.equal(resumed.status,'Completed');assert.deepEqual(calls,['draft','review']);assert.deepEqual(resumed.snapshot,failed.snapshot);
 assert.deepEqual(resumed.steps[0],failed.steps[0]);assert.equal(resumed.steps[1]!.errorCode,undefined);assert.equal(resumed.parentRunId,failed.runId);
 assert.deepEqual(store.get(failed.runId),failed);assert.match(readFileSync(exportRun(failed,join(dir,'exports')).reportPath,'utf8'),/STEP_TIMEOUT/);
 const bad=structuredClone(resumed);bad.steps[1]!.errorCode='STEP_TIMEOUT';assert.equal(RunRecordSchema.safeParse(bad).success,false);
 const badSpec=structuredClone(failed);delete badSpec.snapshot.steps[1]!.timeoutMs;assert.equal(RunRecordSchema.safeParse(badSpec).success,false);
});

test('도구 루프의 후속 모델 대기도 단계 제한에 포함되고 이미 계산한 trace 보존',async t=>{
 const store=new SqliteWorkflowStore(':memory:');t.after(()=>store.close());let calls=0;
 const transport:Transport=async(...args)=>++calls===1?Response.json({status:'completed',output:[{type:'function_call',call_id:'stats',name:'text_stats',arguments:'{"text":"abc"}'}]}):neverRespond(...args);
 const run=await runWorkflow({...definition,steps:[{...definition.steps[2],timeoutMs:100}]},'목표',liveExecutor({env,transport}),undefined,{store,mode:'live'});
 assert.equal(run.status,'Failed');assert.equal(run.steps[0]!.errorCode,'STEP_TIMEOUT');assert.equal(calls,2);
 assert.equal(run.steps[0]!.toolTrace!.modelTurns,2);assert.deepEqual(run.steps[0]!.toolTrace!.tools,[{id:'stats',name:'text_stats',ok:true,data:{characters:3,words:1,lines:1}}]);
 assert.equal(RunRecordSchema.safeParse(run).success,true);
});

test('사용자 취소가 먼저면 정리 중 제한 시간이 지나도 Cancelled 유지',async()=>{
 const c=new AbortController();
 const run=await runWorkflow(timed('plan'),'목표',async input=>{
  c.abort();assert.equal(input.signal!.aborted,true);await delay(150);return {ok:true,text:'늦은 결과'};
 },undefined,{mode:'demo',signal:c.signal});
 assert.equal(run.status,'Cancelled');assert.equal(run.steps[0]!.errorCode,undefined);assert.equal(run.steps[0]!.output,undefined);
});

test('시간 초과가 먼저면 같은 중단 처리에서 취소 요청이 와도 STEP_TIMEOUT 유지',async()=>{
 const c=new AbortController();
 const run=await runWorkflow(timed('plan'),'목표',async input=>new Promise(resolve=>{
  input.signal!.addEventListener('abort',()=>{c.abort();resolve({ok:true,text:'늦은 결과'});},{once:true});
 }),undefined,{mode:'demo',signal:c.signal});
 assert.equal(c.signal.aborted,true);assert.equal(run.status,'Failed');assert.equal(run.steps[0]!.errorCode,'STEP_TIMEOUT');assert.equal(run.steps[0]!.output,undefined);
});

test('승인 대기 시간은 단계 제한에서 제외하고 승인 이후 새 타이머 시작',async t=>{
 const store=new SqliteWorkflowStore(':memory:');t.after(()=>store.close());
 const workflow={...definition,steps:[{...definition.steps[0],reviewBefore:true,timeoutMs:100}]};
 const paused=await runWorkflow(workflow,'목표',demoExecutor,undefined,{store,mode:'demo'});
 assert.equal(paused.status,'Attention');await delay(150);
 const approved=await approveWorkflow(paused.runId,'plan',demoExecutor,undefined,{store,mode:'demo'});
 assert.equal(approved.status,'Completed');assert.deepEqual(approved.approvedSteps,['plan']);
 const second=await approveWorkflow(paused.runId,'plan',async input=>{await delay(5000,undefined,{signal:input.signal});return demoExecutor(input);},undefined,{store,mode:'demo'});
 assert.equal(second.status,'Failed');assert.equal(second.steps[0]!.errorCode,'STEP_TIMEOUT');
});

test('정상 완료 후 타이머 제거: 제한 없는 다음 단계와 부모 signal에 영향 없음',async()=>{
 const c=new AbortController();let firstSignal:AbortSignal|undefined;
 const run=await runWorkflow(timed('plan'),'목표',async input=>{
  if(input.step.id==='plan')firstSignal=input.signal;
  if(input.step.id==='draft')await delay(150);
  return demoExecutor(input);
 },undefined,{mode:'demo',signal:c.signal});
 assert.equal(run.status,'Completed');assert.equal(firstSignal!.aborted,false);assert.equal(c.signal.aborted,false);
});

test('signal을 무시한 실행기도 늦은 성공은 폐기하며 정리 완료 전 다음 단계를 실행하지 않음',async()=>{
 let finished=false;const calls:string[]=[];
 const run=await runWorkflow(timed('plan'),'목표',async input=>{calls.push(input.step.id);await delay(150);finished=true;return {ok:true,text:'늦은 성공'};},undefined,{mode:'demo'});
 assert.equal(finished,true);assert.deepEqual(calls,['plan']);assert.equal(run.status,'Failed');assert.equal(run.steps[0]!.errorCode,'STEP_TIMEOUT');assert.equal(run.steps[0]!.output,undefined);
});

test('단계 실행 래퍼는 이미 취소된 입력 미호출, 종료 후 부모 취소 listener 제거',async()=>{
 const c=new AbortController();c.abort();let calls=0;
 const input:StepInput={step:{id:'test',agent:'planner',provider:'openai',timeoutMs:100},goal:'목표',previous:[],signal:c.signal};
 const cancelled=await executeStep(input,async()=>{calls++;return {ok:true,text:'금지'};});assert.equal(calls,0);assert.equal(cancelled.termination,'cancelled');
 const parent=new AbortController();let signal:AbortSignal|undefined;
 const done=await executeStep({...input,signal:parent.signal},async i=>{signal=i.signal;return {ok:true,text:'결과'};});
 assert.equal(done.termination,undefined);parent.abort();assert.equal(signal!.aborted,false);
});

test('Sidecar는 timeout 설정 수신·오류 코드 응답·기록 조회·후속 실행을 지원',async t=>{
 const store=new SqliteWorkflowStore(':memory:');t.after(()=>store.close());const messages:Message[]=[];
 const handle=createService(store,m=>messages.push(m),{env,transport:neverRespond});
 await handle(req('timed','run.start',{mode:'live',goal:'목표',workflow:timed('plan')}));
 const response=messages.at(-1)!;assert.ok(response.type==='response'&&response.ok);
 const run=RunRecordSchema.parse((response.data as {run:unknown}).run);assert.equal(run.status,'Failed');assert.equal(run.steps[0]!.errorCode,'STEP_TIMEOUT');
 await handle(req('get','run.get',{runId:run.runId}));const got=messages.at(-1)!;assert.ok(got.type==='response'&&got.ok);assert.deepEqual((got.data as {run:unknown}).run,run);
 await handle(req('next','run.start',{mode:'demo',goal:'다음 실행',workflow:definition}));const next=messages.at(-1)!;assert.ok(next.type==='response'&&next.ok);assert.equal((next.data as {run:{status:string}}).run.status,'Completed');
});

test('시간 초과 데모 CLI는 API 없이 예상 실패·재개 완료를 검증',t=>{
 const dir=mkdtempSync(join(tmpdir(),'timeout-demo-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const result=spawnSync(process.execPath,['--import','tsx','src/workflow/timeout-demo.ts'],{cwd:fileURLToPath(new URL('../',import.meta.url)),env:{PATH:process.env.PATH,AGENT_RUNTIME_DB:join(dir,'runs.sqlite')},encoding:'utf8',timeout:15000});
 assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/\[Failed\] draft/);assert.match(result.stdout,/\[Skipped\] review/);assert.match(result.stdout,/STEP_TIMEOUT/);assert.match(result.stdout,/TIMEOUT DEMO PASS/);
});
