import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sampleDraft,DEMO_REQUEST} from '../src/generator/demo.js';
import {diffDrafts,revisionReport} from '../src/generator/revision-report.js';
import {draftRevisionRequest} from '../src/generator/revise.js';
function record(){
 const original={outcome:'draft',request:DEMO_REQUEST,response:sampleDraft()};
 const request=draftRevisionRequest(original,'완료 기준 구체화');
 const response=sampleDraft(request);response.intent=structuredClone(original.response.intent);response.intent.requirements=request.confirmed_requirements;
 return {outcome:'draft',request,response};
}
test('배열 순서 변경은 단계와 연결의 추가 삭제로 오인하지 않음',()=>{
 const before=sampleDraft(),after=structuredClone(before);after.workflow!.nodes.reverse();after.workflow!.edges.reverse();
 for(const n of after.workflow!.nodes){n.input_ports.reverse();n.output_ports.reverse();}
 assert.deepEqual(diffDrafts(before,after),[]);
});
test('작업 지시와 포트 연결 변경을 ID/이름 기준으로 구분',()=>{
 const before=sampleDraft(),after=structuredClone(before);
 const node=after.workflow!.nodes.find(n=>n.id==='summarize')!;node.task!.instructions='변경된 작업 지시';
 node.input_ports[0]!.name='original';
 after.workflow!.edges.find(e=>e.target_node==='summarize'&&e.target_port==='data')!.target_port='original';
 const changes=diffDrafts(before,after);
 assert.ok(changes.some(c=>c.area==='단계 summarize / instructions'&&c.change==='modified'));
 assert.equal(changes.filter(c=>c.area.startsWith('연결 ')).length,2);
 assert.ok(changes.some(c=>c.area.endsWith('/ original')&&c.change==='added'));
});
test('검증된 수정 기록에서 요구사항과 완료 기준의 변경 문서 생성',()=>{
 const r=record();r.response.workflow!.nodes[1]!.task!.completion_criteria.push('추가 기준');
 const before=JSON.stringify(r),report=revisionReport(r);
 assert.ok(report.counts.modified>0);assert.match(report.markdown,/완료 기준 구체화/);
 assert.ok(report.changes.some(c=>c.area.includes('completion_criteria')));assert.equal(JSON.stringify(r),before);
});
test('원본 실패·일반 생성·손상된 이전 초안은 비교 거부',()=>{
 assert.throws(()=>revisionReport({outcome:'draft',request:DEMO_REQUEST,response:sampleDraft()}));
 assert.throws(()=>revisionReport({...record(),outcome:'failed'}));
 const r=record();r.request.draft_revision!.previous_draft.workflow!.edges=[];assert.throws(()=>revisionReport(r));
});
test('모델 문자열의 코드 펜스와 HTML이 문서 구조를 탈출하지 않음',()=>{
 const r=record();r.response.workflow!.nodes[1]!.task!.instructions='```\n<script>attack</script>\n```';
 const report=revisionReport(r);assert.ok(report.markdown.includes('````text\n```\n<script>'));
});
test('질문 상태로 변경되면 실행 계획 미확정을 명시',()=>{
 const r=record();r.outcome='needs_clarification';r.response.status='needs_clarification';r.response.workflow=null;r.response.questions=['어떤 기준을 유지할까요?'];
 const report=revisionReport(r);assert.match(report.markdown,/새 실행 계획이 확정되지/);assert.ok(report.counts.removed>0);
});
