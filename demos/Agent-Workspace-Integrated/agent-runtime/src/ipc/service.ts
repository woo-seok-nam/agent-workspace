import { RequestSchema, RequestId, errorResponse, type Message } from './protocol.js';
import { runWorkflow, resumeWorkflow, rerunWorkflow, getResumePlan, getRerunPlan, approveWorkflow, getApprovalPlan } from '../workflow/runner.js';
import { demoExecutor, liveExecutor, assertWorkflowConfig } from '../workflow/executors.js';
import type { WorkflowStore } from '../workflow/records.js';
import type { RunDependencies } from '../agent-runner.js';
import { AgentError } from '../types.js';
import type { WorkflowEvent } from '../workflow/schema.js';

export function createService(store: WorkflowStore, send: (message: Message) => void, deps: RunDependencies = {}) {
  const seen = new Set<string>();
  let active: { requestId: string; controller: AbortController } | undefined;
  return async (line: string) => {
    let value: unknown;
    try { value = JSON.parse(line); }
    catch { send(errorResponse(null, 'INVALID_JSON', '올바른 JSON 요청이 아닙니다.')); return; }
    const candidate = value && typeof value === 'object' ? (value as Record<string, unknown>).requestId : undefined;
    const id = RequestId.safeParse(candidate).success ? candidate as string : null;
    const parsed = RequestSchema.safeParse(value);
    if (!parsed.success) { send(errorResponse(id, 'INVALID_REQUEST', '프로토콜 버전·메서드·필수 필드·값을 확인하세요.')); return; }
    const request = parsed.data;
    if (seen.has(request.requestId)) { send(errorResponse(id, 'DUPLICATE_REQUEST', '같은 프로세스에서 사용한 requestId입니다.')); return; }
    if (seen.size >= 1000) { send(errorResponse(id, 'SESSION_LIMIT', '처리한 요청이 1,000개입니다. 프로세스를 새로 시작하세요.')); return; }
    seen.add(request.requestId);
    const executes = ['run.start', 'run.resume', 'run.rerun', 'run.approve'].includes(request.method);
    if (executes && active) { send(errorResponse(id, 'BUSY', '이미 실행 중입니다. 종료 응답을 받은 뒤 새 실행을 요청하세요.')); return; }
    const controller = new AbortController();
    if (executes) active = { requestId: request.requestId, controller };
    const signal = controller.signal;
    try {
      let data: unknown;
      const onEvent = (event: WorkflowEvent) => send({ protocolVersion: 1, type: 'event', requestId: request.requestId, event: 'step.status', ...event });
      if (request.method === 'run.cancel') {
        if (!active || active.requestId !== request.params.targetRequestId) {
          send(errorResponse(id, 'NOT_RUNNING', '해당 요청은 이 프로세스에서 실행 중이 아닙니다.')); return;
        }
        active.controller.abort();
        data = { targetRequestId: active.requestId, accepted: true };
      } else if (request.method === 'run.list') data = { runs: store.list() };
      else if (request.method === 'run.get') {
        const run = store.get(request.params.runId);
        if (!run) { send(errorResponse(id, 'RUN_NOT_FOUND', '실행 ID를 찾을 수 없습니다.')); return; }
        data = { run };
      } else if (request.method === 'run.resume' || request.method === 'run.rerun' || request.method === 'run.approve') {
        const { runId, mode } = request.params;
        if (!store.get(runId)) { send(errorResponse(id, 'RUN_NOT_FOUND', '실행 ID를 찾을 수 없습니다.')); return; }
        const execute = mode === 'demo' ? demoExecutor : liveExecutor(deps);
        if (request.method === 'run.approve') {
          const { source, index } = getApprovalPlan(runId, request.params.stepId, store, mode);
          if (mode === 'live') assertWorkflowConfig({ ...source.snapshot, steps: source.snapshot.steps.slice(index) }, deps.env ?? process.env);
          data = { run: await approveWorkflow(runId, request.params.stepId, execute, onEvent, { store, mode, signal }) };
        } else if (request.method === 'run.resume') {
          const { source, remaining } = getResumePlan(runId, store, mode, request.params.recoverInterrupted);
          if (mode === 'live' && remaining.length) assertWorkflowConfig({ ...source.snapshot, steps: remaining }, deps.env ?? process.env);
          data = { run: await resumeWorkflow(runId, execute, onEvent, { store, mode, signal, recoverInterrupted: request.params.recoverInterrupted }) };
        } else {
          const { source, index } = getRerunPlan(runId, request.params.stepId, store, mode);
          if (mode === 'live') assertWorkflowConfig({ ...source.snapshot, steps: source.snapshot.steps.slice(index) }, deps.env ?? process.env);
          data = { run: await rerunWorkflow(runId, request.params.stepId, execute, onEvent, { store, mode, signal }) };
        }
      } else {
        const { mode, workflow, goal } = request.params;
        if (mode === 'live') assertWorkflowConfig(workflow, deps.env ?? process.env);
        const run = await runWorkflow(workflow, goal, mode === 'demo' ? demoExecutor : liveExecutor(deps),
          onEvent,
          { store, mode, signal });
        data = { run };
      }
      send({ protocolVersion: 1, type: 'response', requestId: request.requestId, ok: true, data });
    } catch (e) {
      send(errorResponse(id, e instanceof AgentError ? 'OPERATION_FAILED' : 'INTERNAL_ERROR',
        e instanceof AgentError ? e.message : '요청 처리 중 내부 오류가 발생했습니다.'));
    } finally { if (active?.controller === controller) active = undefined; }
  };
}
