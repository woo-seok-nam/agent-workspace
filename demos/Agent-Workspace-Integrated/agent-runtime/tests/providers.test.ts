import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runModel } from '../src/run.js';
import type { Transport } from '../src/providers/http.js';
const env = { OPENAI_API_KEY:'test-openai', OPENAI_MODEL:'test-gpt', GEMINI_API_KEY:'test-google', GEMINI_MODEL:'test-gemini' };
const outputs = {
 openai: {status:'completed', output:[{type:'reasoning'}, {type:'message',content:[{type:'output_text',text:'답변'}]}]},
 gemini: {candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'비공개 추론'},{text:'답변'}]}}]},
};
for (const provider of ['openai','gemini'] as const) {
 test(`${provider}: 실제 요청 형식·인증 분리·답변 추출`, async () => {
  let calls=0;
  const transport: Transport=async (url, init) => {
   calls++;
   const body=JSON.parse(String(init?.body));
   const h=new Headers(init?.headers);
   if(provider==='openai') { assert.equal(String(url),'https://api.openai.com/v1/responses'); assert.equal(h.get('Authorization'),'Bearer test-openai'); assert.equal(body.input,'테스트 ✅'); assert.equal(body.store,false); }
   if(provider==='gemini') { assert.match(String(url),/models\/test-gemini:generateContent$/); assert.equal(h.get('x-goog-api-key'),'test-google'); assert.equal(body.contents[0].parts[0].text,'테스트 ✅'); }
   assert.ok(init?.signal); assert.equal(init?.redirect,'error');
   return Response.json(outputs[provider]);
  };
  assert.deepEqual(await runModel(provider,'테스트 ✅',env,transport),{provider,model:provider==='openai'?'test-gpt':`test-${provider}`,text:'답변'});
  assert.equal(calls,1);
 });
 test(`${provider}: 완료되지 않은 응답을 성공 처리하지 않음`, async () => {
  await assert.rejects(runModel(provider,'hello',env,async()=>Response.json({})),/완료/);
 });
}
test('설정 누락·잘못된 공급자·공백 입력은 네트워크 호출 전 거부',async()=>{
 const never:Transport=async()=>{throw new Error('must not call');};
 for(const [p,q,e] of [['bad','hi',env],['openai',' ',env],['openai','hi',{}],['openai','hi',{OPENAI_API_KEY:'x'}]] as const)
  await assert.rejects(runModel(p,q,e,never), /공급자|요청|입력하세요/);
});
test('401·429 오류 원문과 비밀정보를 표시하지 않음',async()=>{
 for(const status of [401,429]) {
  await assert.rejects(runModel('openai','hi',env,async()=>new Response('SECRET RAW ERROR',{status})), e=>e instanceof Error && e.message.includes(String(status)) && !e.message.includes('SECRET'));
 }
});
test('빈 텍스트와 연결 실패를 오류로 처리',async()=>{
 await assert.rejects(runModel('openai','hi',env,async()=>Response.json({status:'completed',output:[]})),/텍스트 답변/);
 await assert.rejects(runModel('openai','hi',env,async()=>{throw new Error('SECRET');}),/네트워크/);
});
