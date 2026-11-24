import {test} from 'node:test';
import assert from 'node:assert/strict';
import {previewGeneration} from '../src/generator/preview.js';
import {sampleDraft,DEMO_REQUEST} from '../src/generator/demo.js';
const saved=()=>({outcome:'draft',request:DEMO_REQUEST,response:sampleDraft()});
test('배열 나열 순서 대신 의존 관계로 정렬하고 원문 검토 연결을 표시',()=>{
 const a=saved();a.response.workflow!.nodes.reverse();
 const p=previewGeneration(a);
 assert.deepEqual(p.node_order,['input','summarize','compare','recommend','write','review','output']);
 assert.match(p.markdown,/1번 단계의 proposals → source/);
 assert.match(p.markdown,/최종 검토/);assert.match(p.markdown,/모델 제안/);
 assert.equal(p.readiness?.status,'blocked');
});
test('질문 상태는 작업 순서를 만들지 않고 질문을 전달',()=>{
 const a=saved();a.outcome='needs_clarification';a.response.status='needs_clarification';a.response.workflow=null;a.response.questions=['어떤 보고서가 필요한가요?'];
 const p=previewGeneration(a);assert.deepEqual(p.node_order,[]);assert.equal(p.readiness,null);assert.match(p.markdown,/어떤 보고서/);
});
test('깨진 그래프·상태 불일치·response 단독을 거부',()=>{
 assert.throws(()=>previewGeneration(saved().response));
 assert.throws(()=>previewGeneration({...saved(),outcome:'needs_clarification'}));
 const a=saved();a.response.workflow!.edges=[];assert.throws(()=>previewGeneration(a));
});
test('모델 텍스트를 HTML·링크·표 구문으로 해석하지 않고 원본 보존',()=>{
 const a=saved();a.response.workflow!.nodes[1]!.name='<script>alert(1)</script> | [링크](https://example.com)';
 const before=JSON.stringify(a),p=previewGeneration(a);
 assert.equal(JSON.stringify(a),before);assert.ok(!p.markdown.includes('<script>'));assert.ok(!p.markdown.includes('[링크](https://'));
 assert.ok(p.markdown.includes('\\|'));assert.ok(p.markdown.includes('&lt;script&gt;'));
});
test('사람 작업·도구 제약을 숨기거나 승인 완료로 표시하지 않음',()=>{
 const a=saved();a.response.workflow!.nodes[1]!.task!.prerequisites=[{kind:'human',description:'인터뷰 진행',input_port:null},{kind:'tool',description:'PDF 기능 연결',input_port:null}];
 const p=previewGeneration(a);assert.match(p.markdown,/HUMAN\\_ACTION\\_REQUIRED/);assert.match(p.markdown,/TOOL\\_CONNECTION\\_REQUIRED/);
 assert.match(p.markdown,/승인한 것으로 기록하지 않습니다/);
});
