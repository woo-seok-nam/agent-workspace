import { DraftResponseSchema, type DraftResponse, type GeneratorRequest, type WorkflowNode } from './schema.js';
export interface Issue { code: string; node_id: string | null; path: string; message: string }
export interface Validation { passed: boolean; scope: 'structural_and_explicit_policies'; errors: Issue[]; warnings: Issue[] }
export function validateDraft(value: unknown, request: GeneratorRequest): { response: DraftResponse | null; validation: Validation } {
  const errors: Issue[] = [], warnings: Issue[] = [];
  const issue = (code: string, message: string, node_id: string | null = null, path = '') => errors.push({ code, message, node_id, path });
  const warn = (code: string, message: string, node_id: string | null = null) => warnings.push({ code, message, node_id, path: '' });
  const result = DraftResponseSchema.safeParse(value);
  const done = (response: DraftResponse | null) => ({ response, validation: { passed: errors.length === 0, scope: 'structural_and_explicit_policies' as const, errors, warnings } });
  if (!result.success) {
    for (const e of result.error.issues) issue('SCHEMA_INVALID', e.message, null, e.path.join('.'));
    return done(null);
  }
  const r = result.data;
  for (const req of request.confirmed_requirements) if (!r.intent.requirements.includes(req)) issue('REQUIREMENT_DROPPED', `확정 조건을 그대로 보존해야 합니다: ${req}`);
  if (r.status === 'needs_clarification') {
    if (r.workflow !== null || !r.questions.length) issue('STATUS_INCONSISTENT', '질문 응답은 workflow=null, 질문 1~3개여야 합니다.');
    return done(r);
  }
  if (!r.workflow || r.questions.length || !r.intent.goal.trim() || !r.intent.deliverable.trim()) {
    issue('STATUS_INCONSISTENT', 'draft는 목적·산출물·Workflow가 필요하고 questions는 빈 배열이어야 합니다.'); return done(r);
  }
  const { nodes, edges } = r.workflow;
  const byId = new Map(nodes.map(n => [n.id, n]));
  if (byId.size !== nodes.length) issue('DUPLICATE_NODE', 'Node ID가 중복되었습니다.');
  const inputs = nodes.filter(n => n.type === 'input'), outputs = nodes.filter(n => n.type === 'output');
  if (inputs.length !== 1 || outputs.length !== 1) issue('BOUNDARY_COUNT', 'Input과 Output Node가 각각 1개여야 합니다.');
  if (request.execution_input_mode === 'request' && !inputs[0]?.output_ports.some(p => p.name === 'user_request' && p.type === 'text' && p.required)) issue('REQUEST_INPUT_MISSING', '자연어 실행 모드는 필수 text 입력 user_request가 필요합니다.');
  const graph = new Map(nodes.map(n => [n.id, new Set<string>()]));
  const incoming = new Map<string, number>();
  const connected = new Map<string, number>();
  const edgeKeys = new Set<string>();
  for (const n of nodes) {
    incoming.set(n.id, 0);
    if (n.type === 'work_step' && !n.task) issue('MISSING_TASK', '작업 Node에 task가 필요합니다.', n.id);
    if (n.type !== 'work_step' && n.task !== null) issue('UNEXPECTED_TASK', 'Input/Output의 task는 null이어야 합니다.', n.id);
    if (n.type === 'input' && (n.input_ports.length || !n.output_ports.length)) issue('INPUT_PORTS', 'Input은 입력 포트 없이 출력 포트를 가져야 합니다.', n.id);
    if (n.type === 'output' && (n.output_ports.length || !n.input_ports.some(p => p.required))) issue('OUTPUT_PORTS', 'Output은 필수 입력 포트가 필요하며 출력 포트는 없습니다.', n.id);
    if (n.type === 'work_step' && (!n.input_ports.some(p => p.required) || !n.output_ports.length)) issue('WORK_PORTS', '작업은 필수 입력과 출력 포트가 필요합니다.', n.id);
    for (const ports of [n.input_ports, n.output_ports]) {
      if (new Set(ports.map(p => p.name)).size !== ports.length) issue('DUPLICATE_PORT', '같은 방향의 Port 이름이 중복되었습니다.', n.id);
      for (const p of ports) {
        if (new Set(p.fields.map(f => f.name)).size !== p.fields.length) issue('DUPLICATE_FIELD', 'Port 내부 필드가 중복되었습니다.', n.id);
        if ((p.type === 'object' || p.type === 'table') !== (p.fields.length > 0)) issue('PORT_FIELDS', 'object/table은 내부 필드가 필요하고 text/file_ref는 fields=[]여야 합니다.', n.id);
      }
    }
    const task = n.task;
    if (!task) continue;
    for (const pre of task.prerequisites) {
      if (pre.kind === 'input') {
        if (!pre.input_port || !inputs[0]?.output_ports.some(p => p.name === pre.input_port && p.required))
          issue('INVALID_PREREQUISITE', 'input 선행 조건은 Input의 필수 출력 포트를 참조해야 합니다.', n.id);
      } else if (pre.input_port !== null) issue('INVALID_PREREQUISITE', 'human/tool 선행 조건의 input_port는 null이어야 합니다.', n.id);
    }
    for (const ref of task.requirement_refs) if (!r.intent.requirements.includes(ref)) issue('UNKNOWN_REQUIREMENT', 'requirement_refs는 intent.requirements의 원문을 참조해야 합니다.', n.id);
    for (const tool of task.required_tools) {
      const registered = request.tools.find(t => t.id === tool);
      if (!registered) issue('UNKNOWN_TOOL', `등록되지 않은 도구: ${tool}`, n.id);
      else if (!request.policies.allow_external_search && registered.capabilities.includes('web_search')) issue('EXTERNAL_SEARCH_FORBIDDEN', '외부 검색 금지 정책을 위반합니다.', n.id);
    }
    if (task.missing_capabilities.length) warn('MISSING_CAPABILITY', '실행 전에 필요한 능력이나 자료 확보 방법을 확인해야 합니다.', n.id);
    const why = task.rationale;
    if (why.kind === 'model_proposal') {
      if (why.reference_id !== null || why.location !== null) issue('FABRICATED_REFERENCE', '모델 제안은 Reference ID와 위치를 null로 설정합니다.', n.id);
    } else if (!request.guidance.some(g => g.id === why.reference_id && g.location === why.location)) issue('UNKNOWN_REFERENCE', '제공된 Reference의 ID와 위치만 참조할 수 있습니다.', n.id);
  }
  for (const [i, e] of edges.entries()) {
    const source = byId.get(e.source_node), target = byId.get(e.target_node);
    const a = source?.output_ports.find(p => p.name === e.source_port), b = target?.input_ports.find(p => p.name === e.target_port);
    const key = JSON.stringify(e);
    if (edgeKeys.has(key)) issue('DUPLICATE_EDGE', '중복 연결입니다.', null, `workflow.edges.${i}`);
    edgeKeys.add(key);
    if (!source || !target || !a || !b) { issue('INVALID_REFERENCE', '존재하지 않는 Node 또는 Port 참조입니다.', null, `workflow.edges.${i}`); continue; }
    const inputKey = `${target.id}.${b.name}`;
    connected.set(inputKey, (connected.get(inputKey) ?? 0) + 1);
    if (!graph.get(source.id)!.has(target.id)) { graph.get(source.id)!.add(target.id); incoming.set(target.id, incoming.get(target.id)! + 1); }
    if (a.type !== b.type) issue('PORT_TYPE_MISMATCH', 'Port 타입이 호환되지 않습니다.', target.id);
    if (b.required && !a.required) issue('OPTIONAL_SOURCE', '필수 입력에는 항상 제공되는 출력이 필요합니다.', target.id);
    for (const field of b.fields) {
      const provided = a.fields.find(f => f.name === field.name);
      if (field.required && (!provided || !provided.required)) issue('MISSING_REQUIRED_FIELD', `필수 내부 필드가 없습니다: ${field.name}`, target.id);
      if (provided && provided.type !== field.type) issue('FIELD_TYPE_MISMATCH', `내부 필드 타입 불일치: ${field.name}`, target.id);
    }
  }
  for (const n of nodes) for (const p of n.input_ports) {
    const count = connected.get(`${n.id}.${p.name}`) ?? 0;
    if (p.required && count === 0) issue('UNCONNECTED_INPUT', `필수 입력이 연결되지 않았습니다: ${p.name}`, n.id);
    if (count > 1) issue('MULTIPLE_INPUT_SOURCES', '입력 Port에는 하나의 출처만 연결할 수 있습니다.', n.id);
  }
  const ready = nodes.filter(n => incoming.get(n.id) === 0).map(n => n.id), order: string[] = [];
  let ambiguous = false;
  while (ready.length) {
    if (ready.length > 1) ambiguous = true;
    const current = ready.shift()!; order.push(current);
    for (const next of graph.get(current) ?? []) {
      incoming.set(next, incoming.get(next)! - 1);
      if (incoming.get(next) === 0) ready.push(next);
    }
  }
  if (order.length !== nodes.length) issue('CYCLE', '순환 연결은 v0.1에서 지원하지 않습니다.');
  if (ambiguous) issue('NON_SEQUENTIAL_GRAPH', '실행 순서가 하나로 정해지는 순차 그래프만 지원합니다. 분기·병렬·고립 Node를 확인하세요.');
  if (order[0] !== inputs[0]?.id || order.at(-1) !== outputs[0]?.id) issue('BOUNDARY_ORDER', '그래프는 Input에서 시작하여 Output으로 끝나야 합니다.');
  const reviews = nodes.filter(n => n.type === 'work_step' && n.task?.kind === 'final_review');
  if (reviews.length !== 1) issue('MISSING_FINAL_REVIEW', '최종 검토 작업이 정확히 1개 필요합니다.');
  else {
    const review = reviews[0]!;
    // Preserve every original input, without guessing material semantics from Korean text or IDs.
    for (const input of inputs) for (const source of input.output_ports) {
      const direct = edges.some(e => e.source_node === input.id && e.source_port === source.name
        && e.target_node === review.id && review.input_ports.some(p => p.name === e.target_port
          && p.type === source.type && (!source.required || p.required)
          && JSON.stringify(p.fields) === JSON.stringify(source.fields)));
      if (!direct) issue('REVIEW_ORIGINAL_INPUT_MISSING',
        `최종 검토에 원본 ${input.id}.${source.name}을 별도 입력 포트로 직접 연결하세요. 타입·내부 필드와 필수 여부를 유지하고, 요약으로 대체하지 마세요.`, review.id);
    }
    const previous = byId.get(order.at(-3) ?? '');
    if (previous?.type === 'work_step' && !edges.some(e => e.source_node === previous.id
      && e.target_node === review.id && review.input_ports.some(p => p.name === e.target_port && p.required)))
      issue('REVIEW_RESULT_MISSING', '최종 검토는 직전 작업 결과를 별도 필수 입력으로 받아야 합니다.', review.id);
    if (order.at(-2) !== review.id) issue('REVIEW_NOT_LAST', '최종 검토가 마지막 작업이어야 합니다.', review.id);
    if (edges.some(e => e.target_node === outputs[0]?.id && e.source_node !== review.id)) issue('REVIEW_BYPASS', '최종 산출물은 검토 단계의 출력만 전달해야 합니다.');
    for (const req of r.intent.requirements) if (!review.task!.requirement_refs.includes(req)) issue('REVIEW_REQUIREMENT_GAP', `최종 검토 조건 누락: ${req}`, review.id);
  }
  for (const req of r.intent.requirements) if (!nodes.some(n => n.task?.kind === 'work' && n.task.requirement_refs.includes(req))) issue('REQUIREMENT_NOT_MAPPED', `작업에 연결되지 않은 조건: ${req}`);
  warn('SEMANTIC_REVIEW_REQUIRED', '구조·명시 정책 검사만 통과한 초안입니다. 자연어 조건의 추출 완전성, 실제 절차 적절성, 출처 적용의 타당성은 사용자 검토가 필요합니다.');
  return done(r);
}
