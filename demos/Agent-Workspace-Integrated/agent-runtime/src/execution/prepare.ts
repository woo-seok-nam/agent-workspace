import { z } from 'zod';
import { GeneratorRequestSchema } from '../generator/schema.js';
import { validateDraft } from '../generator/validate.js';
import { assessReadiness } from './readiness.js';
export class PrepareInputError extends Error {}
export function prepareInputs(saved: unknown) {
  const envelope = z.object({outcome:z.literal('draft'),request:GeneratorRequestSchema,response:z.unknown()}).safeParse(saved);
  if(!envelope.success) throw new PrepareInputError('생성 결과가 draft인 record.json이 필요합니다. response.json만으로는 준비할 수 없습니다.');
  const checked=validateDraft(envelope.data.response,envelope.data.request);
  if(!checked.validation.passed || !checked.response?.workflow) throw new PrepareInputError('생성 기록의 구조·정책 검증에 실패했습니다. 초안을 먼저 수정하세요.');
  const workflow=checked.response.workflow;
  const input=workflow.nodes.find(n=>n.type==='input')!;
  const ports=input.output_ports.map((p,index)=>({...p,
    // Numeric prefixes avoid Windows reserved device names (CON, AUX, etc.).
    file:p.type==='text' && p.required ? `materials/input-${index+1}.txt` : null,
  }));
  const files=Object.fromEntries(ports.filter(p=>p.file!==null).map(p=>[p.name,[p.file!]]));
  return {generation:{...envelope.data,response:checked.response},files,ports,readiness:assessReadiness(workflow,{})};
}
export function inputGuide(prepared:ReturnType<typeof prepareInputs>,relativeDirectory:string):string {
  const escape=(s:string)=>s.replace(/\|/g,'\\|').replace(/[\r\n]/g,' ');
  const args=`--record "${relativeDirectory}/record.json" --input-files "${relativeDirectory}/files.json"`;
  return '# 워크플로우 입력 준비\n\n필수 텍스트 자료 파일은 비어 있습니다. 각 파일에 실제 자료를 넣고 UTF-8로 저장하세요. 빈 파일은 실행 전에 거부되며 예시 문장을 실제 자료로 대신 넣지 않습니다.\n\n| 입력 이름 | 필수 | 유형 | 작성할 파일 | 설명 |\n|---|---|---|---|---|\n'+prepared.ports.map(p=>`| ${p.name} | ${p.required?'예':'아니오'} | ${p.type} | ${p.file??'자동 생성 안 함'} | ${escape(p.description)} |`).join('\n')+
    '\n\nfiles.json 경로는 이 양식 폴더를 기준으로 합니다. 선택 입력은 기본 목록에서 제외했습니다. 필요하면 실제 TXT/MD 파일을 만들고 해당 포트 이름으로 files.json에 추가하세요. 원래 생성 기록은 수정하지 않고 record.json 사본을 사용합니다.\n\n'+
    (Object.keys(prepared.files).length ? '프로젝트 agent-runtime 폴더에서 실행:\n\n```powershell\nnpm.cmd run execute -- '+args+' --check\n```\n\nready인 경우 실제 실행(API 호출):\n\n```powershell\nnpm.cmd run execute -- '+args+'\n```\n' : '현재 자동 작성 가능한 필수 text 입력이 없어 실행 명령을 생성하지 않았습니다.\n')+
    '\n## 추가 준비 항목\n\n'+prepared.readiness.issues.map(i=>`- [${i.node_id}] ${i.code}: ${escape(i.detail)}`).join('\n')+
    '\n\n이 목록은 빈 입력 상태의 검사 결과입니다. 자료를 채운 뒤 --check로 다시 확인하세요. 사람 작업·도구·미분류 기능 제약은 파일 입력만으로 해제되지 않습니다. 비텍스트 포트는 현재 실행기가 지원하지 않습니다.\n';
}
