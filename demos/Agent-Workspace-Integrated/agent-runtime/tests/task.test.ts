import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planTask,runTask} from '../src/task/session.js';
import {sampleDraft} from '../src/generator/demo.js';
import {reportMarkdown} from '../src/execution/report.js';
import {previewGeneration} from '../src/generator/preview.js';
import type {GenerationProvider} from '../src/generator/provider.js';
function fixture(){
 const value=sampleDraft();
 for(const n of value.workflow!.nodes){
  n.input_ports=n.input_ports.filter(p=>p.name!=='requirements');n.output_ports=n.output_ports.filter(p=>p.name!=='requirements');
  for(const p of n.output_ports)if(p.name==='proposals')p.name='user_request';
 }
 value.workflow!.edges=value.workflow!.edges.filter(e=>e.source_port!=='requirements');
 for(const e of value.workflow!.edges)if(e.source_port==='proposals')e.source_port='user_request';
 return value;
}
const provider:GenerationProvider={model:'test-fixture',mode:'test',async generate(call){
 assert.equal(JSON.parse(call.context).capabilities.execution_input_mode,'request');
 return {value:fixture(),usage:null,response_id:null};
}};
const signal=()=>new AbortController().signal;
test('자연어→계획 Markdown→별도 실행→답변 Markdown 전 과정',async()=>{
 const plan=await planTask('워크플로우 개념을 쉽게 설명해줘',provider,signal());
 assert.equal(plan.outcome,'draft');assert.match(previewGeneration(plan).markdown,/워크플로우 미리보기/);
 let calls=0,seen=false;
 const result=await runTask(plan,{},async raw=>{
  calls++;const p=JSON.parse(raw);if(p.inputs.data==='워크플로우 개념을 쉽게 설명해줘')seen=true;
  return JSON.stringify({outputs:Object.fromEntries(p.output_ports.map((port:any)=>[port.name,'# 답변\n\n작업을 단계로 나눠 실행합니다.'])),verdict:p.task.kind==='final_review'?'pass':null,issues:[]});
 },signal());
 assert.equal(result.status,'completed');assert.equal(calls,5);assert.equal(seen,true);assert.match(reportMarkdown(result)!,/^# 답변/);
});
test('필수 원문 자료가 없으면 요청으로 대체하지 않고 API 미호출',async()=>{
 const plan=await planTask('설명',provider,signal());
 const input=plan.response!.workflow!.nodes.find(n=>n.type==='input')!;
 input.output_ports.push({name:'source',type:'text',description:'실제 원문',required:true,fields:[]});
 const review=plan.response!.workflow!.nodes.find(n=>n.task?.kind==='final_review')!;
 review.input_ports.push({name:'original_source',type:'text',description:'실제 원문',required:true,fields:[]});
 plan.response!.workflow!.edges.push({source_node:input.id,source_port:'source',target_node:review.id,target_port:'original_source'});
 const result=await runTask(plan,{source:''},async()=>{assert.fail('no call');},signal());
 assert.equal(result.error,'MISSING_INPUT');assert.equal(reportMarkdown(result),null);
});
test('자동 요청 입력 덮어쓰기와 미확정 계획 실행은 거부',async()=>{
 const plan=await planTask('설명',provider,signal());
 await assert.rejects(runTask(plan,{user_request:'다른 요청'},async()=>'',signal()));
 await assert.rejects(runTask({...plan,outcome:'needs_clarification'},{},async()=>'',signal()));
});
test('준비 검사에는 작업 API를 호출하지 않는다',async()=>{
 const plan=await planTask('설명',provider,signal());
 const result=await runTask(plan,{},async()=>{assert.fail('no call');},signal(),{checkOnly:true});
 assert.equal(result.status,'checked');assert.equal(reportMarkdown(result),null);
});
test('최종 검토 미통과 답변은 완료 답변으로 제공하지 않는다',async()=>{
 const plan=await planTask('설명',provider,signal());
 const result=await runTask(plan,{},async raw=>{
  const p=JSON.parse(raw),review=p.task.kind==='final_review';
  return JSON.stringify({outputs:Object.fromEntries(p.output_ports.map((port:any)=>[port.name,'임시 결과'])),verdict:review?'needs_revision':null,issues:review?['근거 부족']:[]});
 },signal());
 assert.equal(result.status,'needs_review');assert.equal(reportMarkdown(result),null);
});
