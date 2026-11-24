import {z} from 'zod';
import {GeneratorRequestSchema,type WorkflowNode} from './schema.js';
import {validateDraft} from './validate.js';
import {assessReadiness} from '../execution/readiness.js';
export class PreviewError extends Error {}
// Model strings are content, not Markdown/HTML instructions or links.
const md=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/([\\`*_{}\[\]()#+.!|~-])/g,'\\$1').replace(/[\r\n]+/g,' ');
const list=(values:string[])=>values.length?values.map(s=>`- ${md(s)}`).join('\n'):'없음';
export function previewGeneration(saved:unknown,availableInputs:Record<string,string>={}) {
 const envelope=z.object({outcome:z.enum(['draft','needs_clarification']),request:GeneratorRequestSchema,response:z.unknown()}).safeParse(saved);
 if(!envelope.success)throw new PreviewError('draft 또는 needs_clarification 생성 record.json이 필요합니다.');
 const checked=validateDraft(envelope.data.response,envelope.data.request);
 if(!checked.validation.passed || !checked.response || envelope.data.outcome!==checked.response.status)throw new PreviewError('생성 기록의 구조·정책 또는 상태가 일치하지 않습니다.');
 const r=checked.response;
 let markdown=`# 워크플로우 미리보기\n\n상태: ${r.status}\n\n이 문서는 실행 전 계획입니다. 작업을 실행하거나 사용자가 승인한 것으로 기록하지 않습니다.\n\n## 요청과 목적\n\n${md(envelope.data.request.request)}\n\n목적: ${md(r.intent.goal)}\n\n예상 산출물: ${md(r.intent.deliverable)}\n\n## 요구사항\n\n${list(r.intent.requirements)}\n\n## 설계 가정\n\n${list(r.intent.assumptions)}\n`;
 if(r.status==='needs_clarification')return {status:r.status,node_order:[] as string[],readiness:null,markdown:markdown+`\n## 추가 확인 질문\n\n${list(r.questions)}\n\n질문에 답한 뒤 초안을 다시 생성하세요. 실행 순서는 아직 확정되지 않았습니다.\n`};
 const workflow=r.workflow!,ordered:WorkflowNode[]=[],remaining=new Map(workflow.nodes.map(n=>[n.id,n]));
 while(remaining.size){
  const available=[...remaining.values()].filter(n=>workflow.edges.filter(e=>e.target_node===n.id).every(e=>!remaining.has(e.source_node)));
  if(available.length!==1)throw new PreviewError('현재 미리보기는 순서가 하나로 정해진 순차 그래프만 지원합니다.');
  ordered.push(available[0]!);remaining.delete(available[0]!.id);
 }
 const index=new Map(ordered.map((n,i)=>[n.id,i+1]));
 const input=ordered.find(n=>n.type==='input')!;
 const readiness=assessReadiness(workflow,availableInputs);
 markdown+=`\n## 필요한 입력 자료\n\n| 이름 | 필수 | 유형 | 설명 |\n|---|---|---|---|\n`+input.output_ports.map(p=>`| ${md(p.name)} | ${p.required?'예':'아니오'} | ${p.type} | ${md(p.description)} |`).join('\n');
 markdown+='\n\n## 작업 순서\n\n| 순서 | 단계 | 역할 |\n|---:|---|---|\n'+ordered.map((n,i)=>`| ${i+1} | ${md(n.name)} | ${n.type==='input'?'입력':n.type==='output'?'최종 전달':n.task?.kind==='final_review'?'최종 검토':'작업'} |`).join('\n');
 for(const n of ordered){
  markdown+=`\n\n## ${index.get(n.id)}. ${md(n.name)}\n\n단계 ID: ${md(n.id)}\n\n`;
  const connections=workflow.edges.filter(e=>e.target_node===n.id).map(e=>`${index.get(e.source_node)}번 단계의 ${e.source_port} → ${e.target_port}`);
  markdown+=`받는 자료:\n\n${list(connections)}\n\n내보내는 자료:\n\n${list(n.output_ports.map(p=>`${p.name} (${p.type}, ${p.required?'필수':'선택'}): ${p.description}`))}\n`;
  if(!n.task)continue;
  const t=n.task;
  markdown+=`\n목적: ${md(t.purpose)}\n\n작업 지시:\n\n${md(t.instructions)}\n\n완료 기준:\n\n${list(t.completion_criteria)}\n\n연결된 요구사항:\n\n${list(t.requirement_refs)}\n`;
  const origin=t.rationale.kind==='model_proposal'?'모델 제안 (외부 참고 근거 없음)':`${t.rationale.kind}: ${t.rationale.reference_id} / ${t.rationale.location}`;
  markdown+=`\n설계 근거: ${md(origin)}\n\n${md(t.rationale.reason)}\n\n선행 조건:\n\n${list(t.prerequisites.map(p=>`${p.kind}${p.input_port?` (${p.input_port})`:''}: ${p.description}`))}\n\n필요 도구:\n\n${list(t.required_tools)}\n\n미해결 기능:\n\n${list(t.missing_capabilities)}\n`;
 }
 markdown+=`\n## 실행 준비 검사\n\n${Object.keys(availableInputs).length ? '자동 전달 예정인 요청을 포함한 검사입니다. 별도 자료가 필요하면 입력 후 다시 검사하세요.' : '자료가 아직 입력되지 않은 상태의 검사입니다. 파일을 채운 뒤 execute --check로 다시 확인하세요.'}\n\n${list(readiness.issues.map(i=>`${i.node_id} / ${i.code}: ${i.detail}`))}\n\n## 검토 안내\n\n이 Markdown을 편집해도 실행 기록은 바뀌지 않습니다. 실제 초안을 수정하려면 record.json의 response를 수정한 뒤 다시 검증하거나 새로 생성하세요. 구조 검사 통과는 내용의 정확성을 보장하지 않습니다. 실행 결과가 아닌 계획이므로 자료를 이미 분석했거나 파일을 생성했다고 해석하지 마세요.\n`;
 return {status:r.status,node_order:ordered.map(n=>n.id),readiness,markdown};
}
