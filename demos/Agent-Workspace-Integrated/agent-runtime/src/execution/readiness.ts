import type { DraftResponse } from '../generator/schema.js';
export interface ReadinessIssue {
  code: 'TEXT_PORTS_ONLY' | 'TOOLS_NOT_SUPPORTED' | 'MISSING_INPUT' | 'CAPABILITY_REVIEW_REQUIRED' | 'HUMAN_ACTION_REQUIRED' | 'TOOL_CONNECTION_REQUIRED';
  node_id: string;
  detail: string;
}
export interface ReadinessReport { status: 'ready' | 'blocked'; issues: ReadinessIssue[] }
// missing_capabilities is prose, not an executable permission or a resolved dependency.
// Do not guess from keywords whether a human action or external tool is available.
export function assessReadiness(workflow: NonNullable<DraftResponse['workflow']>, inputs: Record<string, string>): ReadinessReport {
  const issues: ReadinessIssue[] = [];
  for (const n of workflow.nodes) {
    for (const p of [...n.input_ports, ...n.output_ports]) if (p.type !== 'text')
      issues.push({ code: 'TEXT_PORTS_ONLY', node_id: n.id, detail: `${p.name}: ${p.type} 포트는 현재 실행기가 지원하지 않습니다.` });
    for (const tool of n.task?.required_tools ?? [])
      issues.push({ code: 'TOOLS_NOT_SUPPORTED', node_id: n.id, detail: `${tool}: 도구 실행 연결이 필요합니다.` });
    if (n.type === 'input') for (const p of n.output_ports) if (p.required && !inputs[p.name]?.trim())
      issues.push({ code: 'MISSING_INPUT', node_id: n.id, detail: `${p.name}: 필수 자료를 입력하세요.` });
    for (const pre of n.task?.prerequisites ?? []) {
      if (pre.kind === 'human') issues.push({ code: 'HUMAN_ACTION_REQUIRED', node_id: n.id, detail: pre.description });
      if (pre.kind === 'tool') issues.push({ code: 'TOOL_CONNECTION_REQUIRED', node_id: n.id, detail: pre.description });
      // Input prerequisites are validated against required Input ports by validateDraft.
      // Missing values are already listed once at the Input node above.
    }
    for (const detail of n.task?.missing_capabilities ?? [])
      issues.push({ code: 'CAPABILITY_REVIEW_REQUIRED', node_id: n.id, detail });
  }
  // Retain existing error precedence for callers of executeDraft.
  const order = ['TEXT_PORTS_ONLY', 'TOOLS_NOT_SUPPORTED', 'MISSING_INPUT', 'HUMAN_ACTION_REQUIRED', 'TOOL_CONNECTION_REQUIRED', 'CAPABILITY_REVIEW_REQUIRED'];
  issues.sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code));
  return { status: issues.length ? 'blocked' : 'ready', issues };
}
