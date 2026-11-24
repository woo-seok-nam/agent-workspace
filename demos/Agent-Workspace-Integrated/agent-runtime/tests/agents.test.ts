import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { agents } from '../src/agents.js';
import { runAgent } from '../src/agent-runner.js';
import type { Transport } from '../src/providers/http.js';
const env={OPENAI_API_KEY:'private-test-key',OPENAI_MODEL:'test-gpt',GEMINI_API_KEY:'private-google-key',GEMINI_MODEL:'test-gemini'};
for (const provider of ['openai','gemini'] as const) {
 test(`${provider}: 각 Agent의 지시문을 전달하고 결과와 실행 ID 반환`,async()=>{
  const ids=new Set<string>();
  for(const id of ['planner','writer','reviewer'] as const) {
   let calls=0;
   const transport:Transport=async(_url,init)=>{
    calls++;
    const body=JSON.parse(String(init?.body));
    assert.equal(provider==='openai'?body.instructions:body.systemInstruction.parts[0].text,agents[id].instructions);
    assert.equal(provider==='openai'?body.input:body.contents[0].parts[0].text,'작업 내용');
    return Response.json(provider==='openai'?{status:'completed',output:[{type:'message',content:[{type:'output_text',text:'완료'}]}]}:{candidates:[{finishReason:'STOP',content:{parts:[{text:'완료'}]}}]});
   };
   const r=await runAgent(provider,id,'작업 내용',{env,transport});
   assert.equal(r.status,'Completed');
   if(r.status==='Completed') assert.equal(r.result.text,'완료');
   assert.ok(r.durationMs>=0);assert.ok(!Number.isNaN(Date.parse(r.startedAt)));
   ids.add(r.runId);assert.equal(calls,1);
  }
  assert.equal(ids.size,3);
 });
}
test('제외한 공급자·잘못된 Agent·빈 입력·설정 누락은 호출하지 않음',async()=>{
 let calls=0;const transport:Transport=async()=>{calls++;return Response.json({});};
 for(const [p,a,t,e] of [['unsupported','planner','hi',env],['openai','toString','hi',env],['openai','planner',' ',env],['openai','planner','hi',{}]] as const){
  const r=await runAgent(p,a,t,{env:e,transport});assert.equal(r.status,'Failed');
 }
 assert.equal(calls,0);
});
test('공급자 장애는 Failed 결과와 안전한 오류로 전달',async()=>{
 const r=await runAgent('openai','writer','내용',{env,transport:async()=>new Response('private-test-key',{status:503})});
 assert.equal(r.status,'Failed');
 if(r.status==='Failed'){assert.match(r.error,/503/);assert.ok(!r.error.includes('private-test-key'));}
 assert.ok(!('result' in r));
});
test('doctor는 설정 여부만 표시하고 키·모델 값을 노출하지 않음',()=>{
 const r=spawnSync(process.execPath,['--import','tsx','src/doctor.ts'],{cwd:fileURLToPath(new URL('../',import.meta.url)),env:{...process.env,...env},encoding:'utf8',timeout:10000});
 assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/OPENAI: 설정 있음/);assert.match(r.stdout,/GEMINI: 설정 있음/);
 for(const value of Object.values(env))assert.ok(!(r.stdout+r.stderr).includes(value));
});
test('Agent CLI는 잘못된 역할에 실패 종료코드를 반환',()=>{
 const r=spawnSync(process.execPath,['--import','tsx','src/agent-cli.ts','openai','invalid','내용'],{cwd:fileURLToPath(new URL('../',import.meta.url)),env:{...process.env,...env},encoding:'utf8',timeout:10000});
 assert.equal(r.status,1);assert.match(r.stderr,/\[Failed\]/);assert.equal(r.stdout,'');
});
