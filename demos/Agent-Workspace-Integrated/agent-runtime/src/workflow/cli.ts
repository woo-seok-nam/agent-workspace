import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { runWorkflow, resumeWorkflow, rerunWorkflow, getRerunPlan, approveWorkflow, getApprovalPlan } from './runner.js';
import { WorkflowSchema, type StepExecutor } from './schema.js';
import { assertWorkflowConfig, liveExecutor, demoExecutor } from './executors.js';
import { SqliteWorkflowStore } from './sqlite-store.js';
import type { WorkflowRun } from './records.js';
import { AgentError } from '../types.js';
// 이 개발용 CLI에서는 추적 서비스로 원문을 전송하지 않습니다.
for (const key of ['LANGSMITH_TRACING_V2', 'LANGCHAIN_TRACING_V2', 'LANGSMITH_TRACING', 'LANGCHAIN_TRACING']) process.env[key] = '';

function printRun(run: WorkflowRun) {
  console.log(`\n워크플로: ${run.status} / 실행 ID: ${run.runId} / ${run.mode}`);
  if (run.approval) console.log(`승인 기록: ${run.approval.stepId} / ${run.approval.approvedAt}`);
  if (run.status === 'Attention') console.log(`사용자 승인 대기: ${run.steps.find(s => s.status === 'Attention')?.id}. 초안을 확인한 뒤 approve:${run.mode === 'demo' ? 'demo' : 'live'} 명령으로 승인하세요.`);
  if (run.parentRunId) console.log(`원본 실행: ${run.parentRunId}`);
  if (run.rerunFromStepId) console.log(`다시 실행한 시작 단계: ${run.rerunFromStepId}`);
  for (const step of run.steps) {
    console.log(`\n--- ${step.id} (${step.status}) ---`);
    console.log(step.output ?? step.error ?? (step.status === 'Attention' ? '사용자 승인 대기' : '실행하지 않음'));
    if (step.errorCode) console.log(`오류 코드: ${step.errorCode}`);
    if (step.toolTrace) console.log(`도구 실행 기록: 모델 ${step.toolTrace.modelTurns}회 / 도구 ${step.toolTrace.tools.length}회\n${JSON.stringify(step.toolTrace.tools, null, 2)}`);
  }
}
const args = process.argv.slice(2);
const demo = args[0] === '--demo';
if (demo) args.shift();
const withTools = args[0] === '--with-tools';
if (withTools) args.shift();
const withReview = args[0] === '--with-review';
if (withReview) args.shift();
const mode = demo ? 'demo' : 'live';
const dbPath = process.env.AGENT_RUNTIME_DB?.trim() || fileURLToPath(new URL('../../.local/agent-runtime.sqlite', import.meta.url));
const controller = new AbortController();
const interrupt = () => controller.abort();
process.on('SIGINT', interrupt);
const signal = controller.signal;
let store: SqliteWorkflowStore | undefined;
try {
  if (!args.length) throw new AgentError('사용법: npm.cmd run workflow:demo -- "캡스톤 개발 계획 작성"');
  store = new SqliteWorkflowStore(resolve(dbPath));
  if (args[0] === '--list') {
    if (args.length > 2) throw new AgentError('사용법: npm.cmd run runs [-- 실행ID]');
    if (args[1]) {
      const saved = store.get(args[1]);
      if (!saved) throw new AgentError('실행 ID를 찾을 수 없습니다.');
      printRun(saved);
    } else {
      const runs = store.list();
      console.log('최근 실행 (최대 100개)');
      if (!runs.length) console.log('저장된 실행이 없습니다.');
      for (const r of runs) console.log(`${r.runId} | ${r.mode} | ${r.status} | ${r.updatedAt}${r.parentRunId ? ` | 원본 ${r.parentRunId}` : ''}`);
    }
  } else {
    if (demo) console.log('[DEMO] API 호출 없음. LangGraph와 SQLite는 실제 실행되며 단계별 답변은 고정 시나리오입니다.');
    const onEvent = (e: { stepId: string; status: string }) => console.error(`[${e.status}] ${e.stepId}`);
    let run: WorkflowRun;
    if (args[0] === '--approve') {
      const id = args[1], stepId = args[2];
      if (!id || !stepId || args.length !== 3) throw new AgentError('사용법: npm.cmd run approve:demo -- 실행ID 승인단계ID');
      const { source, index } = getApprovalPlan(id, stepId, store, mode);
      if (!demo) assertWorkflowConfig({ ...source.snapshot, steps: source.snapshot.steps.slice(index) }, process.env);
      run = await approveWorkflow(id, stepId, demo ? demoExecutor : liveExecutor(), onEvent, { store, mode, signal });
    } else if (args[0] === '--rerun') {
      const id = args[1], stepId = args[2];
      if (!id || !stepId || args.length !== 3) throw new AgentError('사용법: npm.cmd run rerun:demo -- 실행ID 시작단계ID');
      const { source, index } = getRerunPlan(id, stepId, store, mode);
      if (!demo) assertWorkflowConfig({ ...source.snapshot, steps: source.snapshot.steps.slice(index) }, process.env);
      console.log(`저장된 완료 단계 재사용: ${source.steps.slice(0, index).map(s => s.id).join(', ') || '없음'}`);
      console.log(`다시 실행할 단계: ${source.steps.slice(index).map(s => s.id).join(' → ')}`);
      run = await rerunWorkflow(id, stepId, demo ? demoExecutor : liveExecutor(), onEvent, { store, mode, signal });
    } else if (args[0] === '--resume') {
      const id = args[1];
      if (!id || args.length > 3 || (args[2] && args[2] !== '--recover')) throw new AgentError('사용법: npm.cmd run resume:demo -- 실행ID [--recover]');
      const source = store.get(id);
      if (!source) throw new AgentError('실행 ID를 찾을 수 없습니다.');
      if (source.mode !== mode) throw new AgentError('저장된 실행과 demo/live 모드가 다릅니다. 같은 모드로 재개하세요.');
      if (source.status === 'Completed') throw new AgentError('이미 완료된 실행입니다. 재개할 단계가 없습니다.');
      if (source.status === 'Running' && args[2] !== '--recover') throw new AgentError('원래 프로세스를 종료한 뒤 --recover 옵션으로 재개하세요.');
      if (source.status === 'Running') console.log('[복구] 완료 저장 전 중단된 단계는 다시 요청합니다. 원래 프로세스가 종료되어 있어야 합니다.');
      const remaining = source.snapshot.steps.filter((_, i) => source.steps[i]!.status !== 'Completed');
      if (!demo && remaining.length) assertWorkflowConfig({ ...source.snapshot, steps: remaining }, process.env);
      console.log(`저장된 완료 단계 재사용: ${source.steps.filter(s => s.status === 'Completed').map(s => s.id).join(', ') || '없음'}`);
      run = await resumeWorkflow(id, demo ? demoExecutor : liveExecutor(), onEvent,
        { store, mode, signal, recoverInterrupted: args[2] === '--recover' });
    } else {
      let failAt: string | undefined;
      if (args[0] === '--fail-at') {
        if (!demo) throw new AgentError('--fail-at은 workflow:demo에서만 사용할 수 있습니다.');
        args.shift(); failAt = args.shift();
        if (!failAt) throw new AgentError('--fail-at 뒤에 실패시킬 단계 ID를 입력하세요.');
      }
      if (!args.length || args[0]!.startsWith('--')) throw new AgentError('목표와 옵션을 확인하세요.');
      const definition: unknown = JSON.parse(readFileSync(new URL(withReview ? '../../workflows/content-review.json' : withTools ? '../../workflows/content-tools.json' : '../../workflows/content.json', import.meta.url), 'utf8'));
      const parsed = WorkflowSchema.safeParse(definition);
      if (!parsed.success) throw new AgentError('workflows/content.json의 단계 정의를 확인하세요.');
      if (failAt && !parsed.data.steps.some(s => s.id === failAt)) throw new AgentError('실패시킬 단계 ID가 워크플로에 없습니다.');
      if (!demo) assertWorkflowConfig(parsed.data, process.env);
      const execute: StepExecutor = demo ? async input => input.step.id === failAt
        ? { ok: false, error: '[DEMO] 재개 확인을 위해 의도적으로 실패시켰습니다.' }
        : demoExecutor(input) : liveExecutor();
      run = await runWorkflow(parsed.data, args.join(' '), execute, onEvent, { store, mode, signal });
    }
    printRun(run);
    console.log(`\n저장 위치: ${resolve(dbPath)}`);
    process.exitCode = run.status === 'Cancelled' ? 130 : run.status === 'Failed' ? 1 : 0;
  }
} catch (e) {
  console.error(e instanceof AgentError ? e.message : '워크플로 실행/저장 중 오류가 발생했습니다. 정의 파일과 DB 경로·권한을 확인하세요.');
  process.exitCode = 1;
} finally { process.off('SIGINT', interrupt); store?.close(); }
