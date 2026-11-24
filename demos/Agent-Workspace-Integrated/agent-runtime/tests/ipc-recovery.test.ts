import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import workflow from '../workflows/content-tools.json' with { type: 'json' };
import { createService } from '../src/ipc/service.js';
import type { Message } from '../src/ipc/protocol.js';
import { SqliteWorkflowStore } from '../src/workflow/sqlite-store.js';
import { runWorkflow } from '../src/workflow/runner.js';
import { demoExecutor } from '../src/workflow/executors.js';
import { RunRecordSchema } from '../src/workflow/records.js';
for (const k of ['LANGSMITH_TRACING_V2','LANGCHAIN_TRACING_V2','LANGSMITH_TRACING','LANGCHAIN_TRACING']) process.env[k]='';
const req=(requestId:string,method:string,params:unknown)=>JSON.stringify({protocolVersion:1,requestId,method,params});
const result=(messages:Message[])=>{const m=messages.at(-1)!;assert.ok(m.type==='response'&&m.ok);return RunRecordSchema.parse((m.data as {run:unknown}).run);};
const failure=(messages:Message[],code:string)=>{const m=messages.at(-1)!;assert.ok(m.type==='response'&&!m.ok);assert.equal(m.error.code,code);};
async function failed(store:SqliteWorkflowStore){return runWorkflow(workflow,'저장된 목표',async i=>i.step.id==='draft'?{ok:false,error:'작성 실패'}:demoExecutor(i),undefined,{store,mode:'demo'});}

test('IPC 재개는 계획을 재사용하고 새 결과·도구 trace·원본 연결을 저장',async t=>{
 const store=new SqliteWorkflowStore(':memory:');t.after(()=>store.close());const original=await failed(store);
 const messages:Message[]=[];const handle=createService(store,m=>messages.push(m));
 await handle(req('resume','run.resume',{runId:original.runId,mode:'demo'}));const run=result(messages);
 assert.equal(run.status,'Completed');assert.equal(run.parentRunId,original.runId);assert.equal(run.goal,original.goal);
 assert.deepEqual(run.steps[0],original.steps[0]);assert.equal(run.steps[2]!.toolTrace!.tools.length,1);
 assert.deepEqual(messages.filter(m=>m.type==='event').map(m=>m.stepId),['draft','draft','review','review']);
 assert.deepEqual(store.get(original.runId),original);assert.deepEqual(store.get(run.runId),run);
});

test('IPC 부분 재실행은 선택 단계만 호출하고 중복 요청은 새 실행을 만들지 않음',async t=>{
 const store=new SqliteWorkflowStore(':memory:');t.after(()=>store.close());const original=await runWorkflow(workflow,'목표',demoExecutor,undefined,{store,mode:'demo'});
 const messages:Message[]=[];const handle=createService(store,m=>messages.push(m));const line=req('rerun','run.rerun',{runId:original.runId,mode:'demo',stepId:'review'});
 await handle(line);const run=result(messages);assert.equal(run.rerunFromStepId,'review');assert.equal(run.parentRunId,original.runId);
 assert.deepEqual(run.steps.slice(0,2),original.steps.slice(0,2));assert.equal(run.steps[2]!.toolTrace!.tools.length,1);
 assert.ok(messages.filter(m=>m.type==='event').every(m=>m.stepId==='review'&&m.requestId==='rerun'));
 await handle(line);failure(messages,'DUPLICATE_REQUEST');assert.equal(store.list().length,2);
});

test('없는 원본·잘못된 단계·모드 혼용·완료 재개·추가 필드는 무실행 거부',async t=>{
 const store=new SqliteWorkflowStore(':memory:');t.after(()=>store.close());const original=await runWorkflow(workflow,'목표',demoExecutor,undefined,{store,mode:'demo'});
 const messages:Message[]=[];const handle=createService(store,m=>messages.push(m));
 const cases:[string,unknown,string][]=[
 ['run.resume',{runId:'00000000-0000-4000-8000-000000000000',mode:'demo'},'RUN_NOT_FOUND'],
 ['run.rerun',{runId:original.runId,mode:'demo',stepId:'missing'},'OPERATION_FAILED'],
 ['run.rerun',{runId:original.runId,mode:'live',stepId:'review'},'OPERATION_FAILED'],
 ['run.resume',{runId:original.runId,mode:'demo'},'OPERATION_FAILED'],
 ['run.resume',{runId:original.runId,mode:'demo',recoverInterrupted:'true'},'INVALID_REQUEST'],
 ['run.rerun',{runId:original.runId,mode:'demo',stepId:'review',goal:'변경'},'INVALID_REQUEST'],
 ];
 for(const [i,[method,params,code]] of cases.entries()){await handle(req(`bad-${i}`,method,params));failure(messages,code);}
 assert.equal(store.list().length,1);assert.equal(messages.filter(m=>m.type==='event').length,0);
});

test('Running 기록 복구는 명시적 옵션이 있을 때만 허용',async t=>{
 const store=new SqliteWorkflowStore(':memory:');t.after(()=>store.close());const original=await failed(store);
 original.status='Running';original.steps=original.steps.map((s,i)=>i===0?s:{id:s.id,agent:s.agent,provider:s.provider,status:i===1?'Running':'Pending'});store.save(original);
 const messages:Message[]=[];const handle=createService(store,m=>messages.push(m));
 await handle(req('blocked','run.resume',{runId:original.runId,mode:'demo'}));failure(messages,'OPERATION_FAILED');assert.equal(store.list().length,1);
 await handle(req('recover','run.resume',{runId:original.runId,mode:'demo',recoverInterrupted:true}));
 assert.equal(result(messages).status,'Completed');assert.deepEqual(store.get(original.runId),original);
});

test('live 재개는 남은 공급자만 검사하며 설정 누락 때 API를 호출하지 않음',async t=>{
 const store=new SqliteWorkflowStore(':memory:');t.after(()=>store.close());const spec=structuredClone(workflow);
 spec.steps[1]!.provider='gemini';spec.steps[2]!.provider='gemini';
 const original=await runWorkflow(spec,'목표',async i=>i.step.id==='draft'?{ok:false,error:'실패'}:demoExecutor(i),undefined,{store,mode:'live'});
 const messages:Message[]=[];let calls=0;
 const transport=async()=>{calls++;return Response.json({candidates:[{finishReason:'STOP',content:{role:'model',parts:[{text:'새 결과'}]}}]});};
 await createService(store,m=>messages.push(m),{env:{},transport})(req('missing-config','run.resume',{runId:original.runId,mode:'live'}));
 failure(messages,'OPERATION_FAILED');assert.equal(calls,0);assert.equal(store.list().length,1);
 await createService(store,m=>messages.push(m),{env:{GEMINI_API_KEY:'fake',GEMINI_MODEL:'fake'},transport})(req('ready','run.resume',{runId:original.runId,mode:'live'}));
 assert.equal(result(messages).status,'Completed');assert.equal(calls,2);
});

test('별도 Sidecar에서 저장된 실패를 재개하고 원본을 같은 연결로 조회',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'ipc-recovery-')),path=join(dir,'runs.sqlite');t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const store=new SqliteWorkflowStore(path);const original=await failed(store);store.close();
 const r=spawnSync(process.execPath,['--import','tsx','src/ipc/sidecar.ts'],{
  cwd:fileURLToPath(new URL('../',import.meta.url)),env:{PATH:process.env.PATH,AGENT_RUNTIME_DB:path},encoding:'utf8',timeout:20000,
  input:req('resume','run.resume',{runId:original.runId,mode:'demo'})+'\n'+req('original','run.get',{runId:original.runId})+'\n'});
 assert.equal(r.status,0,r.stderr);const messages=r.stdout.trim().split('\n').map(line=>JSON.parse(line));
 assert.ok(messages[0].methods.includes('run.resume'));assert.ok(messages[0].methods.includes('run.rerun'));
 const resumed=messages.find(m=>m.type==='response'&&m.requestId==='resume');assert.equal(resumed.data.run.status,'Completed');
 assert.equal(resumed.data.run.parentRunId,original.runId);assert.deepEqual(messages.find(m=>m.type==='response'&&m.requestId==='original').data.run,original);
});
