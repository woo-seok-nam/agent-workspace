import { randomUUID } from 'node:crypto';
import { WorkflowSchema, type Workflow, type StepExecutor, type StepResult, type WorkflowEvent } from './schema.js';
import { compileWorkflow } from './compiler.js';
import { AgentError } from '../types.js';
import { parseRunRecord, type WorkflowRun, type WorkflowStore } from './records.js';

interface RunOptions { store?: WorkflowStore; mode?: 'demo' | 'live'; signal?: AbortSignal }
type Observer = (event: WorkflowEvent) => void;
export async function runWorkflow(definition: unknown, goal: string, execute: StepExecutor, onEvent?: Observer, options: RunOptions = {}) {
  const parsed = WorkflowSchema.safeParse(definition);
  if (!parsed.success) throw new AgentError('워크플로 정의 오류: 단계 ID 중복, Agent·공급자 이름, 필수 필드를 확인하세요.');
  if (!goal.trim() || goal.length > 5000) throw new AgentError('목표는 비어 있지 않은 UTF-16 5,000 이하 문자열이어야 합니다.');
  const snapshot = structuredClone(parsed.data);
  const initial: StepResult[] = snapshot.steps.map(s => ({ id: s.id, agent: s.agent, provider: s.provider, status: 'Pending' }));
  return executeWorkflow(snapshot, goal, initial, execute, onEvent, options);
}

export function getResumePlan(runId: string, store: WorkflowStore, mode: 'demo' | 'live', recoverInterrupted = false) {
  const saved = store.get(runId);
  if (!saved) throw new AgentError('실행 ID를 찾을 수 없습니다. npm.cmd run runs로 확인하세요.');
  const source = parseRunRecord(saved);
  if (source.mode !== mode) throw new AgentError('저장된 실행과 demo/live 모드가 다릅니다. 같은 모드로 재개하세요.');
  if (source.status === 'Attention') throw new AgentError('사용자 승인 대기 중입니다. approve 명령을 사용하세요.');
  if (source.status === 'Completed') throw new AgentError('이미 완료된 실행입니다. 재개할 단계가 없습니다.');
  if (source.status === 'Running' && !recoverInterrupted) throw new AgentError('중단 여부를 확인할 수 없습니다. 원래 프로세스를 종료한 뒤 명시적 복구 옵션으로 재개하세요.');
  return { source, remaining: source.snapshot.steps.filter((_, i) => source.steps[i]!.status !== 'Completed') };
}

export async function resumeWorkflow(runId: string, execute: StepExecutor, onEvent: Observer | undefined,
  options: RunOptions & { store: WorkflowStore; mode: 'demo' | 'live'; recoverInterrupted?: boolean }) {
  const { source } = getResumePlan(runId, options.store, options.mode, options.recoverInterrupted);
  const initial: StepResult[] = source.steps.map(s => s.status === 'Completed' ?
    { id: s.id, agent: s.agent, provider: s.provider, status: 'Completed', output: s.output!,
      ...(s.agentRunId ? { agentRunId: s.agentRunId } : {}),
      ...(s.toolTrace ? { toolTrace: structuredClone(s.toolTrace) } : {}) } :
    { id: s.id, agent: s.agent, provider: s.provider, status: 'Pending' });
  return executeWorkflow(source.snapshot, source.goal, initial, execute, onEvent, options, source.runId, undefined, source.approvedSteps ?? []);
}

export function getRerunPlan(runId: string, stepId: string, store: WorkflowStore, mode: 'demo' | 'live') {
  const saved = store.get(runId);
  if (!saved) throw new AgentError('실행 ID를 찾을 수 없습니다. npm.cmd run runs로 확인하세요.');
  const source = parseRunRecord(saved);
  if (source.mode !== mode) throw new AgentError('저장된 실행과 demo/live 모드가 다릅니다. 같은 모드로 다시 실행하세요.');
  if (source.status === 'Running') throw new AgentError('Running 기록은 부분 재실행할 수 없습니다. 먼저 resume 명령으로 중단 상태를 복구하세요.');
  const index = source.snapshot.steps.findIndex(s => s.id === stepId);
  if (index < 0) throw new AgentError('저장된 워크플로에 해당 단계 ID가 없습니다.');
  if (source.steps.slice(0, index).some(s => s.status !== 'Completed'))
    throw new AgentError('선택한 단계 앞에 미완료 단계가 있습니다. 그 단계 또는 더 앞에서 다시 실행하세요.');
  return { source, index };
}

export async function rerunWorkflow(runId: string, stepId: string, execute: StepExecutor, onEvent: Observer | undefined,
  options: RunOptions & { store: WorkflowStore; mode: 'demo' | 'live' }) {
  const { source, index } = getRerunPlan(runId, stepId, options.store, options.mode);
  // 선택 단계와 이후 결과를 모두 초기화하여 이전 초안/검토가 섞이지 않도록 합니다.
  const initial: StepResult[] = source.steps.map((s, i) => i < index ?
    { id: s.id, agent: s.agent, provider: s.provider, status: 'Completed', output: s.output!,
      ...(s.agentRunId ? { agentRunId: s.agentRunId } : {}),
      ...(s.toolTrace ? { toolTrace: structuredClone(s.toolTrace) } : {}) } :
    { id: s.id, agent: s.agent, provider: s.provider, status: 'Pending' });
  return executeWorkflow(source.snapshot, source.goal, initial, execute, onEvent, options, source.runId, stepId, (source.approvedSteps ?? []).filter(id => source.snapshot.steps.slice(0, index).some(s => s.id === id)));
}

export function getApprovalPlan(runId: string, stepId: string, store: WorkflowStore, mode: 'demo' | 'live') {
  const saved = store.get(runId);
  if (!saved) throw new AgentError('실행 ID를 찾을 수 없습니다.');
  const source = parseRunRecord(saved);
  if (source.mode !== mode) throw new AgentError('저장된 실행과 demo/live 모드가 다릅니다.');
  if (source.status !== 'Attention') throw new AgentError('사용자 승인 대기 중인 실행만 승인할 수 있습니다.');
  const index = source.steps.findIndex(s => s.status === 'Attention');
  if (index < 0 || source.steps[index]!.id !== stepId) throw new AgentError('승인 대기 중인 단계 ID와 일치하지 않습니다.');
  return { source, index };
}

export async function approveWorkflow(runId: string, stepId: string, execute: StepExecutor, onEvent: Observer | undefined,
  options: RunOptions & { store: WorkflowStore; mode: 'demo' | 'live' }) {
  const { source, index } = getApprovalPlan(runId, stepId, options.store, options.mode);
  const initial: StepResult[] = source.steps.map((s, i) => i < index ?
    { id: s.id, agent: s.agent, provider: s.provider, status: 'Completed', output: s.output!,
      ...(s.agentRunId ? { agentRunId: s.agentRunId } : {}), ...(s.toolTrace ? { toolTrace: structuredClone(s.toolTrace) } : {}) } :
    { id: s.id, agent: s.agent, provider: s.provider, status: 'Pending' });
  return executeWorkflow(source.snapshot, source.goal, initial, execute, onEvent, options, source.runId, undefined,
    [...(source.approvedSteps ?? []), stepId], { stepId, approvedAt: new Date().toISOString() });
}

async function executeWorkflow(snapshot: Workflow, goal: string, initial: StepResult[], execute: StepExecutor,
  onEvent: Observer | undefined, options: RunOptions, parentRunId?: string, rerunFromStepId?: string, approvedSteps: string[] = [], approval?: { stepId: string; approvedAt: string }): Promise<WorkflowRun> {
  const start = performance.now(), now = new Date().toISOString();
  const run: WorkflowRun = {
    recordVersion: 1, runId: randomUUID(), ...(parentRunId ? { parentRunId } : {}),
    ...(rerunFromStepId ? { rerunFromStepId } : {}),
    ...(approvedSteps.length ? { approvedSteps: [...approvedSteps] } : {}), ...(approval ? { approval } : {}),
    mode: options.mode ?? 'live', startedAt: now, updatedAt: now, durationMs: 0,
    snapshot: structuredClone(snapshot), goal, status: 'Running', steps: initial, events: [],
  };
  const persist = () => {
    run.updatedAt = new Date().toISOString(); run.durationMs = Math.round(performance.now() - start);
    try { options.store?.save(structuredClone(run)); }
    catch { throw new AgentError('실행 결과를 저장하지 못해 중단했습니다. DB 경로·권한·디스크 공간을 확인하세요.'); }
  };
  const emit = (event: WorkflowEvent) => {
    // 상태 체크포인트를 먼저 저장한 뒤 콘솔/UI에 알립니다.
    try { onEvent?.({ ...event }); } catch { /* observer must not affect execution */ }
  };
  persist();
  const graph = compileWorkflow(run.snapshot, execute, emit, (steps, failed, attention, cancelled) => {
    for (const [i, step] of steps.entries()) {
      if (run.steps[i]!.status !== step.status) run.events.push({ stepId: step.id, status: step.status });
    }
    run.steps = structuredClone(steps); run.status = cancelled ? 'Cancelled' : attention ? 'Attention' : failed ? 'Failed' : 'Running'; persist();
  }, approvedSteps, options.signal);
  const state = await graph.invoke({ goal, steps: initial, failed: false, attention: false, cancelled: false }, { recursionLimit: 32 });
  run.steps = state.steps; run.status = state.cancelled ? 'Cancelled' : state.attention ? 'Attention' : state.failed ? 'Failed' : 'Completed'; persist();
  return structuredClone(run);
}
