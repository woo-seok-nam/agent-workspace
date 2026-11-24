import {z} from 'zod';
import {DraftResponseSchema,GeneratorRequestSchema,type DraftResponse} from './schema.js';
import {validateDraft} from './validate.js';
export class RevisionReportError extends Error {}
export interface DraftChange { area:string; change:'added'|'removed'|'modified'; before:unknown; after:unknown }
function canonical(v:unknown):string {
 if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';
 if(v && typeof v==='object')return '{'+Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>JSON.stringify(k)+':'+canonical(x)).join(',')+'}';
 return JSON.stringify(v);
}
export function diffDrafts(before:DraftResponse,after:DraftResponse):DraftChange[]{
 const result:DraftChange[]=[];
 const change=(area:string,a:unknown,b:unknown)=>{if(canonical(a)!==canonical(b))result.push({area,change:a===undefined?'added':b===undefined?'removed':'modified',before:a??null,after:b??null});};
 for(const key of ['goal','deliverable','requirements','assumptions'] as const)change(`요청 해석 / ${key}`,before.intent[key],after.intent[key]);
 change('응답 상태',before.status,after.status);change('추가 질문',before.questions,after.questions);
 const left=before.workflow,right=after.workflow;
 change('워크플로우 이름',left?.name,right?.name);
 const a=new Map(left?.nodes.map(n=>[n.id,n])??[]),b=new Map(right?.nodes.map(n=>[n.id,n])??[]);
 for(const id of new Set([...a.keys(),...b.keys()])){
  const old=a.get(id),next=b.get(id);
  if(!old||!next){change(`단계 ${id}`,old,next);continue;}
  for(const key of ['name','type'] as const)change(`단계 ${id} / ${key}`,old[key],next[key]);
  if(!old.task||!next.task)change(`단계 ${id} / task`,old.task,next.task);
  else for(const key of Object.keys(old.task) as (keyof typeof old.task)[])change(`단계 ${id} / ${key}`,old.task[key],next.task[key]);
  for(const dir of ['input_ports','output_ports'] as const){
   const x=new Map(old[dir].map(p=>[p.name,p])),y=new Map(next[dir].map(p=>[p.name,p]));
   for(const name of new Set([...x.keys(),...y.keys()]))change(`단계 ${id} / ${dir} / ${name}`,x.get(name),y.get(name));
  }
 }
 const edgeKey=(e:NonNullable<DraftResponse['workflow']>['edges'][number])=>`${e.source_node}.${e.source_port} → ${e.target_node}.${e.target_port}`;
 const x=new Map(left?.edges.map(e=>[edgeKey(e),e])??[]),y=new Map(right?.edges.map(e=>[edgeKey(e),e])??[]);
 for(const key of new Set([...x.keys(),...y.keys()]))change(`연결 ${key}`,x.get(key),y.get(key));
 return result;
}
const escape=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/([\\`*_{}\[\]()#+.!|~-])/g,'\\$1').replace(/[\r\n]/g,' ');
function block(value:unknown):string{
 const text=typeof value==='string'?value:JSON.stringify(value,null,2);
 const longest=Math.max(2,...[...text.matchAll(/`+/g)].map(m=>m[0].length));
 const fence='`'.repeat(longest+1);
 return fence+'text\n'+text+'\n'+fence;
}
export function revisionReport(saved:unknown){
 const parsed=z.object({outcome:z.enum(['draft','needs_clarification']),request:GeneratorRequestSchema,response:DraftResponseSchema}).safeParse(saved);
 if(!parsed.success||!parsed.data.request.draft_revision)throw new RevisionReportError('성공한 초안 수정 record.json이 필요합니다. 일반 생성 기록이나 실패 기록은 비교하지 않습니다.');
 const {request,response,outcome}=parsed.data,before=request.draft_revision!.previous_draft;
 const old=validateDraft(before,{...request,confirmed_requirements:before.intent.requirements});
 const current=validateDraft(response,request);
 if(before.status!=='draft'||!old.validation.passed||!current.validation.passed||outcome!==response.status)throw new RevisionReportError('이전/이후 초안의 구조·정책 검증에 실패했습니다.');
 const changes=diffDrafts(before,response);
 const counts={added:changes.filter(c=>c.change==='added').length,removed:changes.filter(c=>c.change==='removed').length,modified:changes.filter(c=>c.change==='modified').length};
 const labels={added:'추가',removed:'삭제',modified:'변경'};
 const markdown=`# 초안 수정 비교\n\n수정 요청: ${escape(request.draft_revision!.feedback)}\n\n결과 상태: ${outcome}\n\n추가 ${counts.added} / 삭제 ${counts.removed} / 변경 ${counts.modified} (항목 수이며 단계 수가 아닙니다.)\n\nNode는 ID, Port는 이름, Edge는 양끝 연결로 비교합니다. 저장 배열의 순서 변경은 단계 추가/삭제로 세지 않습니다. ID를 바꾸면 이전 단계 삭제와 새 단계 추가로 표시합니다.\n\n이 문서는 차이를 보여주며 수정 요청 충족이나 실행 승인을 판정하지 않습니다. 질문 상태가 되면 기존 계획 제거는 새 실행 계획이 확정되지 않았다는 뜻입니다.\n\n`+
 (changes.length?changes.map((c,i)=>`## ${i+1}. ${labels[c.change]}: ${escape(c.area)}\n\n이전:\n\n${block(c.before)}\n\n이후:\n\n${block(c.after)}`).join('\n\n'):'표시할 변경 사항이 없습니다. 수정 요청이 반영되었는지 확인하세요.')+'\n';
 return {changes,counts,markdown};
}
