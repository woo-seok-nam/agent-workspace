import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { executeTool } from '../src/tools/registry.js';
import { runToolLoop, type ToolSession } from '../src/tool-loop.js';
import { createToolSession } from '../src/providers/tool-session.js';
import type { Transport } from '../src/providers/http.js';
const env={OPENAI_API_KEY:'test-key',OPENAI_MODEL:'test-model',GEMINI_API_KEY:'test-google',GEMINI_MODEL:'test-gemini'};
const call={id:'call-1',name:'text_stats',args:{text:'안녕 세상'}};
test('text_stats: 한글·이모지·CRLF·빈 문자열 계산',()=>{
 assert.deepEqual(executeTool({...call,args:{text:'안녕 😀\r\n세상'}}),{id:'call-1',name:'text_stats',ok:true,data:{characters:8,words:3,lines:2}});
 assert.deepEqual(executeTool({...call,args:{text:''}}),{id:'call-1',name:'text_stats',ok:true,data:{characters:0,words:0,lines:0}});
});
test('미등록 도구·잘못된 인수·추가 필드·길이 초과 거부',()=>{
 assert.equal(executeTool({...call,name:'shell'}).ok,false);
 for(const args of [null,[],{text:42},{text:'ok',extra:true},{text:'x'.repeat(10001)}])assert.equal(executeTool({...call,args}).ok,false);
});
for(const provider of ['openai','gemini'] as const){
 test(`${provider}: 도구 요청→실제 계산→도구 결과 전달→최종 답변`,async()=>{
  const requests:Record<string,any>[]=[];
  const raw=provider==='openai'?[{type:'reasoning',id:'r1',encrypted_content:'OPAQUE'},{type:'function_call',call_id:'call-1',name:'text_stats',arguments:'{"text":"안녕 세상"}'}]
    :{role:'model',parts:[{thoughtSignature:'OPAQUE',functionCall:{id:'call-1',name:'text_stats',args:{text:'안녕 세상'}}}]};
  const transport:Transport=async(_url,init)=>{
   requests.push(JSON.parse(String(init?.body)));
   if(requests.length===1)return Response.json(provider==='openai'?{status:'completed',output:raw}:{candidates:[{finishReason:'STOP',content:raw}]});
   return Response.json(provider==='openai'?{status:'completed',output:[{type:'message',content:[{type:'output_text',text:'5글자입니다.'}]}]}:{candidates:[{finishReason:'STOP',content:{role:'model',parts:[{text:'5글자입니다.'}]}}]});
  };
  const result=await runToolLoop(createToolSession(provider,'분석해줘','지시문',env,transport));
  assert.equal(result.status,'Completed');assert.equal(result.modelTurns,2);assert.equal(result.tools[0]?.ok,true);assert.equal(requests.length,2);
  if(provider==='openai'){
   assert.deepEqual(requests[1]!.input.slice(1,3),raw);
   const output=requests[1]!.input[3];assert.equal(output.call_id,'call-1');assert.equal(JSON.parse(output.output).data.characters,5);
   assert.equal(requests[0]!.tools[0].name,'text_stats');
  }else{
   assert.deepEqual(requests[1]!.contents[1],raw);
   const output=requests[1]!.contents[2].parts[0].functionResponse;
   assert.equal(output.id,'call-1');assert.equal(output.name,'text_stats');assert.equal(output.response.result.characters,5);
   assert.equal(requests[0]!.tools[0].functionDeclarations[0].name,'text_stats');
  }
 });
}
test('도구 미호출 최종 응답은 1회에 완료',async()=>{
 const r=await runToolLoop({next:async()=>({text:'답변',calls:[]})});assert.equal(r.status,'Completed');assert.equal(r.modelTurns,1);assert.equal(r.tools.length,0);
});
test('도구 거부 결과를 모델에 돌려주고 후속 응답 허용',async()=>{
 let count=0;const s:ToolSession={next:async(results)=>{
  if(count++===0)return{text:'',calls:[{...call,name:'shell'}]};
  assert.equal(results[0]?.ok,false);return{text:'도구를 실행할 수 없습니다.',calls:[]};
 }};const r=await runToolLoop(s);assert.equal(r.status,'Completed');assert.equal(r.tools[0]?.ok,false);
});
test('반복 도구 요청은 모델 호출 한도에서 중지',async()=>{
 const r=await runToolLoop({next:async()=>({text:'',calls:[call]})},{maxModelCalls:3,maxToolCalls:8});
 assert.equal(r.status,'Failed');assert.equal(r.modelTurns,3);assert.equal(r.tools.length,2);
});
test('도구 호출 수 제한은 배치 실행 전에 검사',async()=>{
 const r=await runToolLoop({next:async()=>({text:'',calls:[call,{...call,id:'2'}]})},{maxModelCalls:4,maxToolCalls:1});
 assert.equal(r.status,'Failed');assert.equal(r.tools.length,0);
});
test('중복 호출 ID·빈 최종 답변 거부',async()=>{
 for(const turn of [{text:'',calls:[call,call]},{text:'',calls:[]}]){
  const r=await runToolLoop({next:async()=>turn});assert.equal(r.status,'Failed');assert.equal(r.tools.length,0);
 }
});
test('OpenAI JSON 파싱 실패와 HTTP 429는 도구 미실행',async()=>{
 for(const response of [Response.json({status:'completed',output:[{type:'function_call',call_id:'1',name:'text_stats',arguments:'{bad'}]}),new Response('PRIVATE',{status:429})]){
  const r=await runToolLoop(createToolSession('openai','분석','지시문',env,async()=>response));
  assert.equal(r.status,'Failed');assert.equal(r.tools.length,0);
  if(r.status==='Failed')assert.ok(!r.error.includes('PRIVATE'));
 }
});
test('잘못된 실행 한도는 모델 미호출',async()=>{
 let calls=0;const r=await runToolLoop({next:async()=>{calls++;return{text:'ok',calls:[]};}},{maxModelCalls:0,maxToolCalls:2});
 assert.equal(r.status,'Failed');assert.equal(calls,0);
});
test('데모 CLI는 키 없이 실제 도구 결과 표시',()=>{
 const r=spawnSync(process.execPath,['--import','tsx','src/demo.ts','안녕 세상'],{cwd:fileURLToPath(new URL('../',import.meta.url)),env:{PATH:process.env.PATH},encoding:'utf8',timeout:10000});
 assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/\[DEMO\]/);assert.match(r.stdout,/글자 5개, 공백 기준 단어 2개, 줄 1개/);
});
