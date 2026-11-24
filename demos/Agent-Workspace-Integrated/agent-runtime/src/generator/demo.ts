import type { DraftResponse, GeneratorRequest, WorkflowNode } from './schema.js';
import { GeneratorRequestSchema } from './schema.js';
import type { GenerationProvider } from './provider.js';
export const DEMO_REQUEST = GeneratorRequestSchema.parse({
  request: '첨부한 기획안 A·B·C를 개발 난이도, 사용자 가치, 차별성으로 비교하고 캡스톤 주제를 추천하는 보고서 작성 절차를 만들어줘. 외부 검색 없이 첨부 자료만 사용해.',
  confirmed_requirements: ['개발 난이도·사용자 가치·차별성으로 비교', '외부 검색 없이 첨부 자료만 사용', '비교표와 추천 근거를 포함한 보고서'],
  materials: ['a', 'b', 'c'].map(id => ({ id, name: `기획안 ${id.toUpperCase()}`, availability: 'not_provided', description: '실행 전에 사용자가 제공할 기획안 파일. 현재 파일 내용을 읽지 않았음.' })),
  policies: { allow_external_search: false },
});
export function sampleDraft(request: GeneratorRequest = DEMO_REQUEST): DraftResponse {
  const port = (name: string, description: string, type: 'text' | 'file_ref' = 'text') => ({ name, description, type, required: true, fields: [] });
  const work = (id: string, name: string, purpose: string, instructions: string, completion: string, kind: 'work' | 'final_review' = 'work'): WorkflowNode => ({
    id, type: 'work_step', name,
    input_ports: [port('data', '선행 단계 결과'), port('requirements', '사용자 조건')],
    output_ports: [port('result', `${name}의 예상 결과`)],
    task: { kind, purpose, instructions, completion_criteria: [completion],
      rationale: { kind: 'model_proposal', reference_id: null, location: null, reason: `${purpose}에 필요한 절차로 제안한다.` },
      prerequisites: [], required_tools: [], missing_capabilities: [], requirement_refs: [...request.confirmed_requirements] },
  });
  const nodes: WorkflowNode[] = [
    { id: 'input', type: 'input', name: '기획안과 조건 입력', input_ports: [], output_ports: [port('proposals', '실행 전 기획안 3개에서 확보할 텍스트. 자료 확보 전에는 실행 불가.'), port('requirements', '사용자 확정 조건')], task: null },
    work('summarize', '기획안 정리', '동일 항목으로 기획안을 파악한다.', 'A·B·C의 목적·대상 사용자·핵심 기능·기술 요구를 추출하고 원문 위치와 누락 정보를 기록한다. 첨부 자료만 사용한다.', '세 안이 동일 항목으로 정리되고 각 요약에 원문 위치 또는 미확인 표시가 있다.'),
    work('compare', '기준별 비교', '세 기준으로 기획안을 비교한다.', '개발 난이도·사용자 가치·차별성 기준으로 세 안의 장단점을 비교표로 구성한다. 자료에 없는 값은 추측하지 않는다.', '모든 안에 같은 기준이 적용되고 판단마다 근거가 연결된다.'),
    work('recommend', '추천안 도출', '비교 결과에서 추천 근거를 도출한다.', '비교표에 근거하여 캡스톤 적합성을 판단하고 추천 이유·대안·한계를 정리한다. 아직 자료가 없으면 추천 결론을 만들지 않는다.', '추천 이유가 비교 결과와 일치하고 불확실성과 부족한 정보가 드러난다.'),
    work('write', '보고서 작성', '비교표와 추천 근거를 문서로 구성한다.', '비교표·추천안·선택 이유·근거·한계를 포함하는 보고서 초안을 작성한다.', '사용자가 요구한 비교 기준과 추천 이유가 모두 포함되어 있다.'),
    work('review', '최종 검토', '요구사항·근거·논리·완성도를 확인한다.', '초안과 원자료를 대조하고 외부 검색 금지 및 사용자 조건 충족 여부를 검사한다. 핵심 미해결 문제가 있으면 완료로 판단하지 않고 수정 필요 사항을 기록한다.', '요구사항별 검토 결과와 근거가 있으며 미해결 문제와 검토된 산출물이 명확히 구분된다.', 'final_review'),
    { id: 'output', type: 'output', name: '검토된 산출물 전달', input_ports: [port('report', '검토된 보고서 및 미해결 사항')], output_ports: [], task: null },
  ];
  // This fixture consumes required text input; it does not need a file-reading tool.
  // Missing input is checked by the executor before any model call.
  nodes[4]!.input_ports.push(port('comparison', '비교표와 근거'));
  nodes[5]!.input_ports.push(port('source', '원문 대조용 입력 자료'));
  const edges: NonNullable<DraftResponse['workflow']>['edges'] = [];
  for (let i = 1; i <= 5; i++) {
    edges.push({ source_node: nodes[i - 1]!.id, source_port: i === 1 ? 'proposals' : 'result', target_node: nodes[i]!.id, target_port: 'data' });
    edges.push({ source_node: 'input', source_port: 'requirements', target_node: nodes[i]!.id, target_port: 'requirements' });
  }
  edges.push({ source_node: 'compare', source_port: 'result', target_node: 'write', target_port: 'comparison' });
  edges.push({ source_node: 'input', source_port: 'proposals', target_node: 'review', target_port: 'source' });
  edges.push({ source_node: 'review', source_port: 'result', target_node: 'output', target_port: 'report' });
  return { schema_version: '0.1', status: 'draft', intent: {
    goal: '기획안 세 개를 비교하여 캡스톤에 적합한 안을 추천하는 보고서 작성 절차 설계',
    requirements: [...request.confirmed_requirements], assumptions: ['별도 가중치가 없어 세 비교 기준을 동등하게 고려한다.', '실행 전에 원자료의 텍스트가 제공된다.'], deliverable: '비교표·추천 근거·한계를 포함한 보고서',
  }, questions: [], workflow: { name: '캡스톤 기획안 비교 및 추천 보고서', nodes, edges } };
}
export const DEMO_SCENARIOS = ['valid', 'clarification', 'repair', 'failure'] as const;
export function demoProvider(scenario: typeof DEMO_SCENARIOS[number]): GenerationProvider {
  let calls = 0;
  return { model: 'fixture-no-model', mode: 'demo', async generate() {
    calls++;
    const value = sampleDraft();
    if (scenario === 'clarification') {
      value.status = 'needs_clarification'; value.workflow = null;
      value.questions = ['원하는 결과물이 기획서, 비교 보고서, 구현 계획 중 무엇인가요?'];
      value.intent.goal = ''; value.intent.deliverable = ''; value.intent.assumptions = []; value.intent.requirements = [];
    }
    if (scenario === 'failure' || (scenario === 'repair' && calls === 1)) value.workflow!.nodes.find(n => n.id === 'review')!.task!.kind = 'work';
    return { value, usage: null, response_id: null };
  } };
}
