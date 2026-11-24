import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import definition from '../workflows/content-tools.json' with { type: 'json' };
import { runWorkflow, resumeWorkflow, rerunWorkflow } from '../src/workflow/runner.js';
import { demoExecutor, liveExecutor } from '../src/workflow/executors.js';
import { SqliteWorkflowStore } from '../src/workflow/sqlite-store.js';
import { exportRun } from '../src/workflow/artifacts.js';
import { WorkflowSchema } from '../src/workflow/schema.js';
import { finishToolStep } from '../src/workflow/tool-executor.js';
for (const k of ['LANGSMITH_TRACING_V2','LANGCHAIN_TRACING_V2','LANGSMITH_TRACING','LANGCHAIN_TRACING']) process.env[k]='';

test('도구 Workflow는 실제 초안을 계산하고 단계 trace를 DB·문서에 저장', async t => {
 const dir=mkdtempSync(join(tmpdir(),'workflow-tools-'));const db=join(dir,'runs.sqlite');
 let store=new SqliteWorkflowStore(db);t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true});});
 const run=await runWorkflow(definition,'개발 계획 😀',demoExecutor,undefined,{store,mode:'demo'});
 assert.equal(run.status,'Completed');const trace=run.steps[2]!.toolTrace!;
 assert.equal(trace.modelTurns,2);assert.equal(trace.tools.length,1);
 const result=trace.tools[0]!;assert.equal(result.ok,true);
 if(result.ok) assert.equal(result.data.characters,[...run.steps[1]!.output!].length);
 store.close();store=new SqliteWorkflowStore(db);assert.deepEqual(store.get(run.runId),run);
 const artifact=exportRun(store.get(run.runId),join(dir,'exports'));
 assert.match(readFileSync(artifact.reportPath,'utf8'),/도구 실행 기록/);
 assert.deepEqual(JSON.parse(readFileSync(artifact.jsonPath,'utf8')).steps[2].toolTrace,trace);
});

for(const provider of ['openai','gemini'] as const) test(`${provider}: 실제 어댑터와 가상 HTTP로 Workflow 도구 왕복`,async()=>{
 const spec={schemaVersion:1,id:'tool-test',name:'도구',steps:[{id:'review',agent:'reviewer',provider,tools:{}}]};
 let calls=0;
 const exec=liveExecutor({env:{OPENAI_API_KEY:'fake',OPENAI_MODEL:'fake',GEMINI_API_KEY:'fake',GEMINI_MODEL:'fake'},transport:async(_url,init)=>{
  const body=JSON.parse(String(init?.body));calls++;
  if(calls===1){
   assert.ok(JSON.stringify(body).includes('목표'));
   return provider==='openai'?Response.json({status:'completed',output:[{type:'function_call',call_id:'c1',name:'text_stats',arguments:JSON.stringify({text:'안녕 세상'})}]}):
    Response.json({candidates:[{finishReason:'STOP',content:{role:'model',parts:[{functionCall:{name:'text_stats',args:{text:'안녕 세상'}}}]}}]});
  }
  assert.ok(JSON.stringify(body).includes('characters'));assert.ok(JSON.stringify(body).includes('words'));
  return provider==='openai'?Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'도구로 확인: 5글자'}]}]}):
   Response.json({candidates:[{finishReason:'STOP',content:{role:'model',parts:[{text:'도구로 확인: 5글자'}]}}]});
 }});
 const run=await runWorkflow(spec,'목표',exec);
 assert.equal(run.status,'Completed');assert.equal(calls,2);assert.equal(run.steps[0]!.toolTrace!.tools[0]!.ok,true);
 assert.match(run.steps[0]!.output!,/5글자/);
});

test('호출 한도 실패 시 trace 저장·후속 단계 차단·실패 단계부터 재개',async t=>{
 const store=new SqliteWorkflowStore(':memory:');t.after(()=>store.close());
 const spec=structuredClone(definition);spec.steps[0]!.tools={maxModelCalls:1,maxToolCalls:8};
 const run=await runWorkflow(spec,'목표',demoExecutor,undefined,{store,mode:'demo'});
 assert.equal(run.status,'Failed');assert.deepEqual(run.steps[0]!.toolTrace,{modelTurns:1,tools:[]});
 assert.equal(run.steps[1]!.status,'Skipped');
 // 저장된 설정을 유지하므로 같은 데모는 같은 한도에서 실패합니다.
 const resumed=await resumeWorkflow(run.runId,demoExecutor,undefined,{store,mode:'demo'});
 assert.equal(resumed.status,'Failed');assert.equal(resumed.parentRunId,run.runId);
 assert.deepEqual(store.get(run.runId),run);
});

test('완료된 도구 단계는 재개·부분 재실행에서 재사용, 재실행 대상 trace는 초기화',async t=>{
 const store=new SqliteWorkflowStore(':memory:');t.after(()=>store.close());
 const spec=structuredClone(definition);spec.steps[0]!.tools={maxModelCalls:4,maxToolCalls:8};
 const failed=await runWorkflow(spec,'목표',async i=>i.step.id==='draft'?{ok:false,error:'작성 실패'}:demoExecutor(i),undefined,{store,mode:'demo'});
 const calls:string[]=[];
 const resumed=await resumeWorkflow(failed.runId,async i=>{calls.push(i.step.id);return demoExecutor(i);},undefined,{store,mode:'demo'});
 assert.equal(resumed.status,'Completed');assert.deepEqual(calls,['draft','review']);
 assert.deepEqual(resumed.steps[0]!.toolTrace,failed.steps[0]!.toolTrace);
 const rerun=await rerunWorkflow(resumed.runId,'review',async()=>({ok:false,error:'새 실패'}),undefined,{store,mode:'demo'});
 assert.deepEqual(rerun.steps[0]!.toolTrace,resumed.steps[0]!.toolTrace);
 assert.equal(rerun.steps[2]!.toolTrace,undefined);assert.equal(rerun.steps[2]!.output,undefined);
 assert.deepEqual(store.get(resumed.runId),resumed);
});

test('도구 실행 후 모델 오류가 나도 실제 도구 기록 보존, 원시 예외 제외',async()=>{
 const step=WorkflowSchema.parse(definition).steps[2]!;let turns=0;
 const result=await finishToolStep({step,goal:'목표',previous:[]},{async next(){
  if(++turns===1)return{text:'',calls:[{id:'1',name:'text_stats',args:{text:'가나다'}}]};
  throw new Error('PRIVATE_ERROR');
 }});
 assert.equal(result.ok,false);assert.equal(result.toolTrace!.modelTurns,2);assert.equal(result.toolTrace!.tools[0]!.ok,true);
 assert.ok(!JSON.stringify(result).includes('PRIVATE_ERROR'));
});

test('도구 설정 오류는 실행 전에 거부하고 미등록 도구 거부 기록을 남김',async()=>{
 const bad=structuredClone(definition);bad.steps[2]!.tools!.maxModelCalls=11;
 await assert.rejects(runWorkflow(bad,'목표',demoExecutor),/정의 오류/);
 let turns=0;const step=WorkflowSchema.parse(definition).steps[2]!;
 const result=await finishToolStep({step,goal:'목표',previous:[]},{async next(results){
  if(++turns===1)return{text:'',calls:[{id:'x',name:'delete_file',args:{path:'private'}}]};
  assert.equal(results[0]!.ok,false);return{text:'도구가 거부되었습니다.',calls:[]};
 }});
 assert.equal(result.toolTrace!.tools[0]!.ok,false);assert.ok(!JSON.stringify(result.toolTrace).includes('private'));
});

test('도구 Workflow CLI는 키 없이 호출 기록과 실제 통계를 표시',t=>{
 const dir=mkdtempSync(join(tmpdir(),'tool-cli-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const r=spawnSync(process.execPath,['--import','tsx','src/workflow/cli.ts','--demo','--with-tools','캡스톤 계획'],{
  cwd:fileURLToPath(new URL('../',import.meta.url)),env:{PATH:process.env.PATH,AGENT_RUNTIME_DB:join(dir,'runs.sqlite')},encoding:'utf8',timeout:15000});
 assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/워크플로: Completed/);assert.match(r.stdout,/모델 2회 \/ 도구 1회/);assert.match(r.stdout,/실제 text_stats 결과/);
});
