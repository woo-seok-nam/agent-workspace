import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import definition from '../workflows/content.json' with { type: 'json' };
import { runWorkflow, rerunWorkflow, resumeWorkflow } from '../src/workflow/runner.js';
import { SqliteWorkflowStore } from '../src/workflow/sqlite-store.js';
import { demoExecutor } from '../src/workflow/executors.js';
import type { StepExecutor } from '../src/workflow/schema.js';
for (const k of ['LANGSMITH_TRACING_V2', 'LANGCHAIN_TRACING_V2', 'LANGSMITH_TRACING', 'LANGCHAIN_TRACING']) process.env[k] = '';
const oldExecutor: StepExecutor = async ({ step }) => ({ ok: true, text: `old-${step.id}`, agentRunId: `old-id-${step.id}` });

test('완료된 실행의 작성부터 재실행: 계획 재사용·새 초안 전달·원본 보존', async t => {
  const store = new SqliteWorkflowStore(':memory:'); t.after(() => store.close());
  const source = await runWorkflow(definition, '원래 목표', oldExecutor, undefined, { store, mode: 'demo' });
  const calls: string[] = [];
  const run = await rerunWorkflow(source.runId, 'draft', async ({ step, goal, previous }) => {
    calls.push(step.id); assert.equal(goal, '원래 목표');
    assert.deepEqual(previous, step.id === 'draft' ? [{ stepId: 'plan', output: 'old-plan' }] :
      [{ stepId: 'plan', output: 'old-plan' }, { stepId: 'draft', output: 'new-draft' }]);
    return { ok: true, text: `new-${step.id}`, agentRunId: `new-id-${step.id}` };
  }, undefined, { store, mode: 'demo' });
  assert.deepEqual(calls, ['draft', 'review']); assert.equal(run.status, 'Completed');
  assert.notEqual(run.runId, source.runId); assert.equal(run.parentRunId, source.runId);
  assert.equal(run.rerunFromStepId, 'draft'); assert.deepEqual(run.steps[0], source.steps[0]);
  assert.deepEqual(store.get(source.runId), source); assert.deepEqual(store.get(run.runId), run);
  assert.ok(run.events.every(e => e.stepId !== 'plan'));
});

test('첫 단계는 전체 재실행, 마지막 단계는 검토만 재실행', async t => {
  const store = new SqliteWorkflowStore(':memory:'); t.after(() => store.close());
  const source = await runWorkflow(definition, '목표', oldExecutor, undefined, { store, mode: 'demo' });
  for (const [stepId, expected] of [['plan', ['plan', 'draft', 'review']], ['review', ['review']]] as const) {
    const calls: string[] = [];
    const run = await rerunWorkflow(source.runId, stepId, async input => { calls.push(input.step.id); return demoExecutor(input); }, undefined, { store, mode: 'demo' });
    assert.deepEqual(calls, expected); assert.equal(run.status, 'Completed');
  }
});

test('잘못된 ID·모드·미완료 선행 단계·Running 원본은 실행과 저장 없이 거부', async t => {
  const store = new SqliteWorkflowStore(':memory:'); t.after(() => store.close());
  const source = await runWorkflow(definition, '목표', async input => input.step.id === 'draft' ? { ok: false, error: '실패' } : demoExecutor(input), undefined, { store, mode: 'demo' });
  let calls = 0; const execute: StepExecutor = async () => { calls++; return { ok: true, text: '결과' }; };
  for (const [id, step, mode, error] of [
    [source.runId, 'missing', 'demo', /단계 ID/],
    ['missing', 'draft', 'demo', /실행 ID/],
    [source.runId, 'draft', 'live', /모드/],
    [source.runId, 'review', 'demo', /미완료/],
  ] as const) await assert.rejects(rerunWorkflow(id, step, execute, undefined, { store, mode }), error);
  const running = structuredClone(source); running.status = 'Running';
  running.steps = running.snapshot.steps.map(step => ({ ...step, status: 'Pending' }));
  store.save(running);
  await assert.rejects(rerunWorkflow(source.runId, 'plan', execute, undefined, { store, mode: 'demo' }), /Running/);
  assert.equal(calls, 0); assert.equal(store.list().length, 1);
});

test('재실행 중 실패하면 기존 하위 결과를 버리고 이후 resume은 새 실행을 이어감', async t => {
  const store = new SqliteWorkflowStore(':memory:'); t.after(() => store.close());
  const source = await runWorkflow(definition, '목표', oldExecutor, undefined, { store, mode: 'demo' });
  const failed = await rerunWorkflow(source.runId, 'draft', async () => ({ ok: false, error: '새 요청 실패' }), undefined, { store, mode: 'demo' });
  assert.equal(failed.status, 'Failed');
  assert.deepEqual(failed.steps.map(s => s.status), ['Completed', 'Failed', 'Skipped']);
  for (const step of failed.steps.slice(1)) { assert.equal(step.output, undefined); assert.equal(step.agentRunId, undefined); }
  const calls: string[] = [];
  const resumed = await resumeWorkflow(failed.runId, async input => { calls.push(input.step.id); return demoExecutor(input); }, undefined, { store, mode: 'demo' });
  assert.deepEqual(calls, ['draft', 'review']); assert.equal(resumed.parentRunId, failed.runId);
  assert.equal(resumed.status, 'Completed'); assert.deepEqual(store.get(source.runId), source);
});

test('이전 0.5 형식 기록을 재접속한 CLI에서 부분 재실행하고 조회', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'agent-rerun-')), path = join(dir, 'runs.sqlite');
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const store = new SqliteWorkflowStore(path);
  const source = await runWorkflow(definition, 'CLI 재실행', oldExecutor, undefined, { store, mode: 'demo' });
  assert.equal(source.rerunFromStepId, undefined); store.close();
  const cwd = fileURLToPath(new URL('../', import.meta.url));
  const cli = (...args: string[]) => spawnSync(process.execPath, ['--import', 'tsx', 'src/workflow/cli.ts', ...args], {
    cwd, encoding: 'utf8', timeout: 15000, env: { PATH: process.env.PATH, AGENT_RUNTIME_DB: path },
  });
  const result = cli('--demo', '--rerun', source.runId, 'draft');
  assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /워크플로: Completed/);
  assert.match(result.stdout, /저장된 완료 단계 재사용: plan/);
  assert.ok(!result.stderr.includes('[Running] plan')); assert.match(result.stderr, /\[Running\] review/);
  const id = /실행 ID: ([\da-f-]+)/.exec(result.stdout)![1]!;
  const view = cli('--list', id); assert.equal(view.status, 0, view.stderr);
  assert.match(view.stdout, /다시 실행한 시작 단계: draft/); assert.ok(view.stdout.includes(source.runId));
});
