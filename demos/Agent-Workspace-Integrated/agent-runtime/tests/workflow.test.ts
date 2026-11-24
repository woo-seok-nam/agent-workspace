import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import definition from '../workflows/content.json' with { type: 'json' };
import { runWorkflow } from '../src/workflow/runner.js';
import { liveExecutor, assertWorkflowConfig } from '../src/workflow/executors.js';
import { WorkflowSchema } from '../src/workflow/schema.js';
import type { Transport } from '../src/providers/http.js';
// 테스트 실행 환경에서 추적 서비스로 전송하지 않습니다.
for(const k of ['LANGSMITH_TRACING_V2','LANGCHAIN_TRACING_V2','LANGSMITH_TRACING','LANGCHAIN_TRACING'])process.env[k]='';
test('LangGraph 순차 실행과 이전 결과 전달',async()=>{
 const seen:string[]=[];
 const run=await runWorkflow(definition,'사용자 목표',async({step,goal,previous})=>{
  assert.equal(goal,'사용자 목표');assert.deepEqual(previous.map(p=>p.stepId),seen);
  previous.forEach(p=>assert.equal(p.output,`${p.stepId} 결과`));
  seen.push(step.id);return {ok:true,text:`${step.id} 결과`};
 });
 assert.equal(run.status,'Completed');assert.deepEqual(seen,['plan','draft','review']);
 assert.deepEqual(run.steps.map(s=>s.status),['Completed','Completed','Completed']);
 assert.deepEqual(run.events.map(e=>e.status),['Running','Completed','Running','Completed','Running','Completed']);
 assert.equal(run.steps[1]?.output,'draft 결과');assert.equal(run.steps[2]?.output,'review 결과');
});
test('중간 실패 시 뒤 단계 Skipped, 완료된 결과 보존',async()=>{
 const seen:string[]=[];
 const run=await runWorkflow(definition,'목표',async({step})=>{seen.push(step.id);return step.id==='draft'?{ok:false,error:'요청 실패'}:{ok:true,text:'계획'};});
 assert.equal(run.status,'Failed');assert.deepEqual(seen,['plan','draft']);
 assert.deepEqual(run.steps.map(s=>s.status),['Completed','Failed','Skipped']);
 assert.equal(run.steps[0]?.output,'계획');assert.equal(run.steps[2]?.output,undefined);
});
test('잘못된 정의 및 빈 목표는 실행 전에 거부',async()=>{
 let calls=0;const exec=async()=>{calls++;return {ok:true as const,text:'결과'};};
 for(const bad of [{...definition,steps:[]},{...definition,steps:[definition.steps[0],definition.steps[0]]},{...definition,extra:true},{...definition,steps:[{...definition.steps[0],provider:'unsupported'}]}])
  await assert.rejects(runWorkflow(bad,'목표',exec),/워크플로 정의/);
 await assert.rejects(runWorkflow(definition,' ',exec),/목표/);assert.equal(calls,0);
});
test('예외·빈 산출물은 실패로 전환하고 원시 예외 숨김',async()=>{
 for(const exec of [async()=>{throw new Error('SECRET');},async()=>({ok:true as const,text:' '})]){
  const r=await runWorkflow(definition,'목표',exec);assert.equal(r.status,'Failed');
  assert.equal(r.steps[0]?.status,'Failed');assert.equal(r.steps[1]?.status,'Skipped');
  assert.ok(!JSON.stringify(r).includes('SECRET'));
 }
});
test('실행 시작 후 원본 변경이 snapshot과 그래프에 영향 없음',async()=>{
 const source=structuredClone(definition);
 const r=await runWorkflow(source,'목표',async()=>({ok:true,text:'결과'}),()=>{source.steps.length=0;});
 assert.equal(r.snapshot.steps.length,3);assert.equal(r.steps.length,3);assert.equal(r.status,'Completed');
});
test('liveExecutor는 기존 Agent 호출을 재사용하고 누적 결과를 전송',async()=>{
 const inputs:string[]=[];
 const transport:Transport=async(_url,init)=>{
  const body=JSON.parse(String(init?.body));inputs.push(body.input);
  return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:`응답${inputs.length}`}]}]});
 };
 const r=await runWorkflow(definition,'목표',liveExecutor({env:{OPENAI_API_KEY:'test-key',OPENAI_MODEL:'test-model'},transport}));
 assert.equal(r.status,'Completed');assert.equal(inputs.length,3);
 assert.ok(inputs[1]!.includes('응답1'));assert.ok(inputs[2]!.includes('응답1'));assert.ok(inputs[2]!.includes('응답2'));
 assert.ok(r.steps.every(s=>s.agentRunId));
});
test('설정 누락·입력 한도 초과 시 실제 호출하지 않음',async()=>{
 assert.throws(()=>assertWorkflowConfig(WorkflowSchema.parse(definition),{}),/OPENAI/);
 let calls=0;
 const exec=liveExecutor({transport:async()=>{calls++;return Response.json({});}});
 const r=await exec({step:WorkflowSchema.parse(definition).steps[0]!,goal:'목표',previous:[{stepId:'prior',output:'x'.repeat(10001)}]});
 assert.equal(r.ok,false);assert.equal(calls,0);
});
test('workflow:demo CLI는 키 없이 3단계 결과를 표시',t=>{
 const dir=mkdtempSync(join(tmpdir(),'workflow-cli-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const r=spawnSync(process.execPath,['--import','tsx','src/workflow/cli.ts','--demo','캡스톤 계획'],{cwd:fileURLToPath(new URL('../',import.meta.url)),env:{PATH:process.env.PATH,AGENT_RUNTIME_DB:join(dir,'runs.sqlite'),LANGSMITH_TRACING:'true',LANGCHAIN_TRACING:'true'},encoding:'utf8',timeout:15000});
 assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/\[DEMO\]/);assert.match(r.stdout,/워크플로: Completed/);
 assert.match(r.stdout,/plan \(Completed\)/);assert.match(r.stdout,/draft \(Completed\)/);assert.match(r.stdout,/review \(Completed\)/);
});
