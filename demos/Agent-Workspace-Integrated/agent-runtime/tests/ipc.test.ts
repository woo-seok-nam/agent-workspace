import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Readable } from 'node:stream';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import workflow from '../workflows/content-tools.json' with { type: 'json' };
import { createService } from '../src/ipc/service.js';
import { readFrames, MAX_FRAME_BYTES } from '../src/ipc/framing.js';
import type { Message } from '../src/ipc/protocol.js';
import { SqliteWorkflowStore } from '../src/workflow/sqlite-store.js';
import { RunRecordSchema } from '../src/workflow/records.js';
for (const k of ['LANGSMITH_TRACING_V2','LANGCHAIN_TRACING_V2','LANGSMITH_TRACING','LANGCHAIN_TRACING']) process.env[k]='';
const request=(requestId:string,method:string,params:unknown={})=>JSON.stringify({protocolVersion:1,requestId,method,params});
const start=(id:string)=>request(id,'run.start',{mode:'demo',goal:'개발 계획 😀',workflow});

test('JSONL은 분리된 UTF-8·CRLF·복수 요청·EOF 마지막 행을 복원',async()=>{
 const data=Buffer.from('한글😀\r\n둘\n셋');const chunks=Array.from(data,b=>Buffer.from([b]));
 const frames=[];for await(const f of readFrames(Readable.from(chunks)))frames.push(f);
 assert.deepEqual(frames,[{line:'한글😀\r'},{line:'둘'},{line:'셋'}]);
});
test('과대 행과 잘못된 UTF-8 뒤 정상 행을 계속 수신',async()=>{
 const frames=[];const chunks=[Buffer.alloc(MAX_FRAME_BYTES+1,65),Buffer.from('more\n'),Buffer.from([255,10]),Buffer.from('ok\n')];
 for await(const f of readFrames(Readable.from(chunks)))frames.push(f);
 assert.deepEqual(frames,[{error:'FRAME_TOO_LARGE'},{error:'INVALID_UTF8'},{line:'ok'}]);
});
test('한 서비스에서 실행→진행 이벤트→결과→상세 및 목록 조회',async t=>{
 const store=new SqliteWorkflowStore(':memory:');t.after(()=>store.close());const messages:Message[]=[];
 const handle=createService(store,m=>messages.push(m));await handle(start('one'));
 const events=messages.filter(m=>m.type==='event');assert.equal(events.length,6);assert.ok(events.every(e=>e.requestId==='one'));
 const result=messages.at(-1)!;assert.ok(result.type==='response'&&result.ok);
 const run=RunRecordSchema.parse((result.data as {run:unknown}).run);assert.equal(run.status,'Completed');assert.equal(run.steps[2]!.toolTrace!.tools.length,1);
 await handle(request('two','run.get',{runId:run.runId}));
 const got=messages.at(-1)!;assert.ok(got.type==='response'&&got.ok);assert.deepEqual((got.data as {run:unknown}).run,run);
 await handle(request('three','run.list'));const listed=messages.at(-1)!;assert.ok(listed.type==='response'&&listed.ok);assert.equal((listed.data as {runs:unknown[]}).runs.length,1);
});
test('중복 요청은 실행하지 않고 잘못된 요청 원문도 오류 응답에 노출하지 않음',async t=>{
 const store=new SqliteWorkflowStore(':memory:');t.after(()=>store.close());const messages:Message[]=[];const handle=createService(store,m=>messages.push(m));
 await handle(start('same'));await handle(start('same'));
 const duplicate=messages.at(-1)!;assert.ok(duplicate.type==='response'&&!duplicate.ok);assert.equal(duplicate.error.code,'DUPLICATE_REQUEST');assert.equal(store.list().length,1);
 for(const line of ['{SECRET',JSON.stringify({protocolVersion:2,requestId:'v2',method:'run.list',params:{}}),request('bad','run.start',{mode:'demo',goal:'SECRET',workflow,apiKey:'SECRET'})])await handle(line);
 assert.ok(!JSON.stringify(messages.slice(-3)).includes('SECRET'));assert.equal(store.list().length,1);
});
test('실행 실패와 프로토콜 실패를 구분하고 실패 뒤에도 조회 가능',async t=>{
 const store=new SqliteWorkflowStore(':memory:');t.after(()=>store.close());const messages:Message[]=[];const handle=createService(store,m=>messages.push(m));
 const limited=structuredClone(workflow);limited.steps[2]!.tools!.maxModelCalls=1;
 await handle(request('fail','run.start',{mode:'demo',goal:'목표',workflow:limited}));
 const response=messages.at(-1)!;assert.ok(response.type==='response'&&response.ok);
 assert.equal(RunRecordSchema.parse((response.data as {run:unknown}).run).status,'Failed');
 await handle(request('missing','run.get',{runId:'00000000-0000-4000-8000-000000000000'}));
 const missing=messages.at(-1)!;assert.ok(missing.type==='response'&&!missing.ok);assert.equal(missing.error.code,'RUN_NOT_FOUND');
 await handle(request('list','run.list'));assert.ok(messages.at(-1)!.type==='response');
});
test('live 설정 누락은 API 미호출, 내부 저장 오류는 정제',async t=>{
 const store=new SqliteWorkflowStore(':memory:');t.after(()=>store.close());const messages:Message[]=[];let calls=0;
 const handle=createService(store,m=>messages.push(m),{env:{},transport:async()=>{calls++;throw new Error('NETWORK_SECRET');}});
 await handle(request('live','run.start',{mode:'live',goal:'목표',workflow}));assert.equal(calls,0);assert.equal(store.list().length,0);
 const fail=messages.at(-1)!;assert.ok(fail.type==='response'&&!fail.ok);assert.equal(fail.error.code,'OPERATION_FAILED');
 const broken=createService({save(){throw new Error('DB_SECRET');},get(){throw new Error('DB_SECRET');},list(){throw new Error('DB_SECRET');}},m=>messages.push(m));
 await broken(request('broken','run.list'));assert.ok(!JSON.stringify(messages).includes('DB_SECRET'));
});
test('실제 Sidecar 프로세스 stdout은 JSONL 전용이며 오류 뒤에도 처리',t=>{
 const dir=mkdtempSync(join(tmpdir(),'sidecar-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const result=spawnSync(process.execPath,['--import','tsx','src/ipc/sidecar.ts'],{
  cwd:fileURLToPath(new URL('../',import.meta.url)),env:{PATH:process.env.PATH,AGENT_RUNTIME_DB:join(dir,'runs.sqlite')},encoding:'utf8',timeout:20000,
  input:'{bad\n'+start('start')+'\n'+request('list','run.list')+'\n'});
 assert.equal(result.status,0,result.stderr);const messages=result.stdout.trim().split('\n').map(line=>JSON.parse(line));
 assert.equal(messages[0].type,'ready');assert.equal(messages[1].error.code,'INVALID_JSON');
 assert.equal(messages.filter(m=>m.type==='event').length,6);const listed=messages.find(m=>m.type==='response'&&m.requestId==='list');assert.equal(listed.data.runs.length,1);assert.ok(messages.some(m=>m.type==='response'&&m.requestId==='start'&&m.data.run.status==='Completed'));
});
test('통신 데모 클라이언트는 같은 자식 프로세스로 실행과 조회 왕복',t=>{
 const dir=mkdtempSync(join(tmpdir(),'ipc-demo-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const result=spawnSync(process.execPath,['--import','tsx','src/ipc/demo.ts','한글 목표 😀'],{
  cwd:fileURLToPath(new URL('../',import.meta.url)),env:{PATH:process.env.PATH,AGENT_RUNTIME_DB:join(dir,'runs.sqlite')},encoding:'utf8',timeout:20000});
 assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/IPC DEMO PASS/);assert.match(result.stdout,/조회 완료/);assert.match(result.stdout,/실제 text_stats 결과/);
});
