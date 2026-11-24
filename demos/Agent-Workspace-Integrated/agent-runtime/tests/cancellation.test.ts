import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PassThrough } from 'node:stream';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import definition from '../workflows/content-tools.json' with { type: 'json' };
import { runWorkflow, resumeWorkflow } from '../src/workflow/runner.js';
import { demoExecutor, liveExecutor } from '../src/workflow/executors.js';
import { SqliteWorkflowStore } from '../src/workflow/sqlite-store.js';
import { RunRecordSchema } from '../src/workflow/records.js';
import { exportRun } from '../src/workflow/artifacts.js';
import { runModel } from '../src/run.js';
import { createToolSession } from '../src/providers/tool-session.js';
import { runToolLoop } from '../src/tool-loop.js';
import { createService } from '../src/ipc/service.js';
import { serve } from '../src/ipc/serve.js';
import type { Message } from '../src/ipc/protocol.js';
import type { Transport } from '../src/providers/http.js';
for (const k of ['LANGSMITH_TRACING_V2','LANGCHAIN_TRACING_V2','LANGSMITH_TRACING','LANGCHAIN_TRACING']) process.env[k]='';
const env={OPENAI_API_KEY:'fake',OPENAI_MODEL:'fake',GEMINI_API_KEY:'fake',GEMINI_MODEL:'fake'};
const req=(requestId:string,method:string,params:unknown={})=>JSON.stringify({protocolVersion:1,requestId,method,params});
function pendingHttp() {
  let started!: (signal: AbortSignal) => void;
  const entered = new Promise<AbortSignal>(resolve => { started = resolve; });
  let calls=0;
  const transport:Transport=async(_url,options)=>{
    calls++;const signal=options!.signal!;started(signal);
    return new Promise<Response>((_resolve,reject)=>{
      if(signal.aborted)reject(signal.reason);
      else signal.addEventListener('abort',()=>reject(signal.reason),{once:true});
    });
  };
  return {transport,entered,calls:()=>calls};
}
function response(messages:Message[],id:string){
 const m=messages.find(m=>m.type==='response'&&m.requestId===id);assert.ok(m&&m.type==='response');return m;
}

test('미리 취소한 실행은 Agent 미호출·Cancelled 저장·이후 Skipped',async t=>{
 const store=new SqliteWorkflowStore(':memory:');t.after(()=>store.close());const c=new AbortController();c.abort();let calls=0;
 const run=await runWorkflow(definition,'목표',async()=>{calls++;return {ok:true,text:'호출되면 안 됨'};},undefined,{store,mode:'demo',signal:c.signal});
 assert.equal(calls,0);assert.equal(run.status,'Cancelled');assert.deepEqual(run.steps.map(s=>s.status),['Cancelled','Skipped','Skipped']);
 assert.deepEqual(store.get(run.runId),run);
});

test('HTTP 대기 취소는 완료 단계 보존·DB 재접속·미완료 단계만 재개·부분 결과 내보내기',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'cancel-')),path=join(dir,'runs.sqlite');let store=new SqliteWorkflowStore(path);
 t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true});});const c=new AbortController(),http=pendingHttp();
 const execute=liveExecutor({env,transport:http.transport});
 const pending=runWorkflow(definition,'목표',i=>i.step.id==='plan'?demoExecutor(i):execute(i),undefined,{store,mode:'live',signal:c.signal});
 const signal=await http.entered;c.abort();const run=await pending;
 assert.equal(signal.aborted,true);assert.equal(http.calls(),1);assert.equal(run.status,'Cancelled');
 assert.deepEqual(run.steps.map(s=>s.status),['Completed','Cancelled','Skipped']);assert.equal(run.steps[1]!.output,undefined);
 store.close();store=new SqliteWorkflowStore(path);assert.deepEqual(store.get(run.runId),run);
 const calls:string[]=[];const resumed=await resumeWorkflow(run.runId,async i=>{calls.push(i.step.id);return demoExecutor(i);},undefined,{store,mode:'live'});
 assert.deepEqual(calls,['draft','review']);assert.equal(resumed.status,'Completed');assert.equal(resumed.parentRunId,run.runId);
 assert.deepEqual(resumed.steps[0],run.steps[0]);assert.deepEqual(store.get(run.runId),run);
 assert.match(readFileSync(exportRun(run,join(dir,'exports')).reportPath,'utf8'),/취소한 실행의 부분 결과/);
});

for(const provider of ['openai','gemini'])test(`${provider}: 일반 호출과 도구 호출 모두 HTTP signal 중단`,async()=>{
 for(const withTools of [false,true]){
   const c=new AbortController(),http=pendingHttp();
   const pending=withTools?createToolSession(provider,'목표','지침',env,http.transport,c.signal).next([]):runModel(provider,'목표',env,http.transport,{signal:c.signal});
   const rejected=assert.rejects(pending,/취소/);const signal=await http.entered;c.abort();await rejected;
   assert.equal(signal.aborted,true);assert.equal(http.calls(),1);
 }
});

test('이미 취소한 HTTP 요청은 네트워크 미호출',async()=>{
 const c=new AbortController();c.abort();let calls=0;
 await assert.rejects(runModel('openai','목표',env,async()=>{calls++;return Response.json({});},{signal:c.signal}),/취소/);assert.equal(calls,0);
});

test('응답 직후 취소하면 반환된 도구 호출을 실행하거나 다음 모델을 호출하지 않음',async()=>{
 const c=new AbortController();let calls=0;
 const result=await runToolLoop({async next(){calls++;c.abort();return {text:'',calls:[{id:'one',name:'text_stats',args:{text:'계산 금지'}}]};}},undefined,c.signal);
 assert.equal(result.status,'Failed');assert.equal(calls,1);assert.deepEqual(result.tools,[]);
});

test('도구 결과 전달 중 취소는 이미 실행한 도구 trace를 보존',async t=>{
 const store=new SqliteWorkflowStore(':memory:');t.after(()=>store.close());const c=new AbortController(),http=pendingHttp();let calls=0;
 const transport:Transport=async(...args)=>++calls===1?Response.json({status:'completed',output:[{type:'function_call',call_id:'one',name:'text_stats',arguments:'{"text":"abc"}'}]}):http.transport(...args);
 const pending=runWorkflow({...definition,steps:[definition.steps[2]]},'목표',liveExecutor({env,transport}),undefined,{store,mode:'live',signal:c.signal});
 await http.entered;c.abort();const run=await pending;
 assert.equal(run.status,'Cancelled');assert.equal(calls,2);assert.equal(run.steps[0]!.toolTrace!.modelTurns,2);
 assert.deepEqual(run.steps[0]!.toolTrace!.tools,[{id:'one',name:'text_stats',ok:true,data:{characters:3,words:1,lines:1}}]);
 assert.equal(RunRecordSchema.safeParse(run).success,true);
});

test('취소 뒤 재개해도 승인되지 않은 게이트를 우회하지 않음',async t=>{
 const store=new SqliteWorkflowStore(':memory:');t.after(()=>store.close());const c=new AbortController();c.abort();
 const spec={...definition,steps:definition.steps.map((s,i)=>({...s,reviewBefore:i===0}))};
 const cancelled=await runWorkflow(spec,'목표',demoExecutor,undefined,{store,mode:'demo',signal:c.signal});
 const resumed=await resumeWorkflow(cancelled.runId,demoExecutor,undefined,{store,mode:'demo'});
 assert.equal(resumed.status,'Attention');assert.equal(resumed.steps[0]!.status,'Attention');
 const invalid=structuredClone(cancelled);invalid.steps[0]!.output='위조';assert.equal(RunRecordSchema.safeParse(invalid).success,false);
 const invalidTail=structuredClone(cancelled);invalidTail.steps[1]!.status='Pending';assert.equal(RunRecordSchema.safeParse(invalidTail).success,false);
});

test('이미 완료된 마지막 단계의 이벤트에서 취소해도 완료 기록 유지',async()=>{
 const c=new AbortController();
 const run=await runWorkflow(definition,'목표',demoExecutor,e=>{if(e.stepId==='review'&&e.status==='Completed')c.abort();},{mode:'demo',signal:c.signal});
 assert.equal(run.status,'Completed');
});

test('Sidecar 실행 중 조회·BUSY·취소·중복 차단·새 실행 및 비실행 취소 거부',async t=>{
 const store=new SqliteWorkflowStore(':memory:');t.after(()=>store.close());const http=pendingHttp(),messages:Message[]=[];
 const handle=createService(store,m=>messages.push(m),{env,transport:http.transport});
 const pending=handle(req('work','run.start',{mode:'live',goal:'목표',workflow:definition}));await http.entered;
 await handle(req('list','run.list'));assert.equal(response(messages,'list').ok,true);
 const id=store.list()[0]!.runId;await handle(req('get','run.get',{runId:id}));assert.equal(response(messages,'get').ok,true);
 await handle(req('busy','run.start',{mode:'demo',goal:'중복 실행 금지',workflow:definition}));
 const busy=response(messages,'busy');assert.ok(!busy.ok);assert.equal(busy.error.code,'BUSY');
 await handle(req('wrong','run.cancel',{targetRequestId:'unknown'}));const wrong=response(messages,'wrong');assert.ok(!wrong.ok);assert.equal(wrong.error.code,'NOT_RUNNING');
 await handle(req('cancel','run.cancel',{targetRequestId:'work'}));assert.equal(response(messages,'cancel').ok,true);
 await pending;const done=response(messages,'work');assert.ok(done.ok);const run=RunRecordSchema.parse((done.data as {run:unknown}).run);assert.equal(run.status,'Cancelled');
 assert.equal(http.calls(),1);assert.equal(store.list().length,1);
 await handle(req('cancel','run.cancel',{targetRequestId:'work'}));const duplicate=messages.at(-1)!;assert.ok(duplicate.type==='response'&&!duplicate.ok);assert.equal(duplicate.error.code,'DUPLICATE_REQUEST');
 await handle(req('late','run.cancel',{targetRequestId:'work'}));const late=response(messages,'late');assert.ok(!late.ok);assert.equal(late.error.code,'NOT_RUNNING');
 await handle(req('next','run.start',{mode:'demo',goal:'다음 실행',workflow:definition}));const next=response(messages,'next');assert.ok(next.ok);assert.equal((next.data as {run:{status:string}}).run.status,'Completed');
});

test('실제 JSONL 입력 루프는 HTTP 대기 중 취소를 읽고 EOF 후 결과 저장까지 대기',async t=>{
 const store=new SqliteWorkflowStore(':memory:');t.after(()=>store.close());const http=pendingHttp(),messages:Message[]=[],input=new PassThrough();
 const send=(m:Message)=>{messages.push(m);};const served=serve(input,createService(store,send,{env,transport:http.transport}),send);
 input.write(req('work','run.start',{mode:'live',goal:'목표',workflow:definition})+'\n');await http.entered;
 input.end(req('cancel','run.cancel',{targetRequestId:'work'})+'\n');await served;
 assert.equal(response(messages,'cancel').ok,true);const done=response(messages,'work');assert.ok(done.ok);
 assert.equal((done.data as {run:{status:string}}).run.status,'Cancelled');assert.equal(store.list()[0]!.status,'Cancelled');
});

test('취소 데모 CLI는 API 없이 취소와 재개를 완료',t=>{
 const dir=mkdtempSync(join(tmpdir(),'cancel-demo-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const result=spawnSync(process.execPath,['--import','tsx','src/workflow/cancel-demo.ts'],{cwd:fileURLToPath(new URL('../',import.meta.url)),env:{PATH:process.env.PATH,AGENT_RUNTIME_DB:join(dir,'runs.sqlite')},encoding:'utf8',timeout:15000});
 assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/\[Cancelled\] draft/);assert.match(result.stdout,/\[Skipped\] review/);assert.match(result.stdout,/CANCEL DEMO PASS/);
});


test('CLI Ctrl+C는 HTTP를 중단하고 Cancelled 저장 후 코드 130으로 종료', { skip: process.platform === 'win32', timeout: 10000 }, async t => {
 const dir=mkdtempSync(join(tmpdir(),'cancel-sigint-')),db=join(dir,'runs.sqlite'),fixture=join(dir,'http.mjs');
 t.after(()=>rmSync(dir,{recursive:true,force:true}));
 writeFileSync(fixture, `globalThis.fetch = async (_url, options) => new Promise((_resolve, reject) => {
   const timer = setTimeout(() => reject(new Error('fixture timeout')), 8000);
   options.signal.addEventListener('abort', () => { clearTimeout(timer); reject(options.signal.reason); }, { once: true });
   process.stderr.write('HTTP_READY\\n');
 });`);
 const child=spawn(process.execPath,['--import','tsx','--import',pathToFileURL(fixture).href,'src/workflow/cli.ts','취소 테스트'],{
   cwd:fileURLToPath(new URL('../',import.meta.url)),env:{PATH:process.env.PATH,...env,AGENT_RUNTIME_DB:db},stdio:['ignore','pipe','pipe'],
 });
 t.after(()=>{if(child.exitCode===null)child.kill('SIGKILL');});
 let stderr='',stdout='',sent=false;
 child.stdout.setEncoding('utf8').on('data',(chunk:string)=>{stdout+=chunk;});
 child.stderr.setEncoding('utf8').on('data',(chunk:string)=>{stderr+=chunk;if(!sent&&stderr.includes('HTTP_READY')){sent=true;child.kill('SIGINT');}});
 const code=await new Promise<number|null>((resolve,reject)=>{child.on('error',reject);child.on('close',resolve);});
 assert.equal(sent,true,stderr);assert.equal(code,130,stderr);assert.match(stdout,/워크플로: Cancelled/);
 const store=new SqliteWorkflowStore(db);try{assert.equal(store.list()[0]!.status,'Cancelled');}finally{store.close();}
});
