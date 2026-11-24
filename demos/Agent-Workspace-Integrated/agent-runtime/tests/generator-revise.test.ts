import {test} from 'node:test';
import assert from 'node:assert/strict';
import {draftRevisionRequest} from '../src/generator/revise.js';
import {sampleDraft,DEMO_REQUEST} from '../src/generator/demo.js';
import {generateWorkflow} from '../src/generator/generate.js';
import type {GenerationProvider} from '../src/generator/provider.js';
const saved=()=>({outcome:'draft',request:DEMO_REQUEST,response:sampleDraft()});
const feedback='보고서 작성 단계의 완료 기준을 구체화해줘';
function provider(goalChange=false):GenerationProvider{return {model:'fixture',mode:'test',async generate(input){
 const c=JSON.parse(input.context);assert.equal(c.draft_revision.feedback,feedback);
 const value=structuredClone(c.draft_revision.previous_draft);
 value.intent.requirements=c.confirmed_requirements;
 for(const n of value.workflow.nodes)if(n.task)n.task.requirement_refs=c.confirmed_requirements;
 value.workflow.nodes.find((n:any)=>n.id==='write').task.completion_criteria.push('비교표와 추천 근거가 포함되어 있다.');
 if(goalChange)value.intent.goal='다른 작업';
 return {value,usage:null,response_id:null};
}};}
test('원본 불변, 수정 문맥과 조건 유지, 변경 경로 기록',async()=>{
 const old=saved(),original=JSON.stringify(old);const request=draftRevisionRequest(old,feedback);
 const r=await generateWorkflow(request,provider());
 assert.equal(JSON.stringify(old),original);assert.equal(r.outcome,'draft');
 assert.equal(r.response!.intent.goal,old.response.intent.goal);
 assert.ok(r.response!.intent.requirements.includes(feedback));
 assert.ok(r.revision_changes?.some(p=>p.includes('completion_criteria')));
 assert.equal(r.human_review_required,true);
});
test('기존 목적 변경은 보정 한도 후 실패',async()=>{
 const r=await generateWorkflow(draftRevisionRequest(saved(),feedback),provider(true),{maxRepairs:0});
 assert.equal(r.outcome,'failed');assert.ok(r.validation?.errors.some(e=>e.code==='INTENT_CHANGED_DURING_REPAIR'));
});
test('잘못된 원본·빈 수정 요청·과대 요청은 provider 호출 전에 거부',()=>{
 assert.throws(()=>draftRevisionRequest(saved(),''));assert.throws(()=>draftRevisionRequest(saved(),'가'.repeat(2001)));
 assert.throws(()=>draftRevisionRequest({...saved(),outcome:'failed'},feedback));
 const bad=saved();bad.response.workflow!.edges=[];assert.throws(()=>draftRevisionRequest(bad,feedback));
});
test('재수정은 이전 스냅샷을 중첩하지 않고 조건을 보존',async()=>{
 const first=await generateWorkflow(draftRevisionRequest(saved(),feedback),provider());
 const next=draftRevisionRequest(first,'단계 이름을 쉽게 바꿔줘');
 assert.equal(next.draft_revision!.source_run_id,first.run_id);
 assert.equal('draft_revision' in next.draft_revision!.previous_draft,false);
 assert.ok(next.confirmed_requirements.includes(feedback));
});
test('충돌 시 질문 응답을 허용하며 작업을 실행하지 않음',async()=>{
 const request=draftRevisionRequest(saved(),feedback);
 const r=await generateWorkflow(request,{model:'fixture',mode:'test',async generate(){
 const value=sampleDraft(request);value.intent.requirements=request.confirmed_requirements;value.status='needs_clarification';value.workflow=null;value.questions=['어떤 기준을 유지할까요?'];
 return {value,usage:null,response_id:null};
 }});
 assert.equal(r.outcome,'needs_clarification');assert.equal(r.response!.workflow,null);
});
test('이전 초안 문맥 한도 초과는 API 호출 전에 중단',async()=>{
 let calls=0;const r=await generateWorkflow(draftRevisionRequest(saved(),feedback),{model:'fixture',mode:'test',async generate(){calls++;throw Error();}},{maxContextChars:100});
 assert.equal(calls,0);assert.equal(r.error?.code,'CONTEXT_LIMIT');
});
