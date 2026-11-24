import assert from 'node:assert/strict';
import { test, after, type TestContext } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import definition from '../workflows/content.json' with { type: 'json' };
import { runWorkflow, resumeWorkflow } from '../src/workflow/runner.js';
import { SqliteWorkflowStore } from '../src/workflow/sqlite-store.js';
import { parseRunRecord, type WorkflowStore } from '../src/workflow/records.js';
import { demoExecutor } from '../src/workflow/executors.js';
import type { StepExecutor } from '../src/workflow/schema.js';
for (const k of ['LANGSMITH_TRACING_V2', 'LANGCHAIN_TRACING_V2', 'LANGSMITH_TRACING', 'LANGCHAIN_TRACING']) process.env[k] = '';
const cwd = fileURLToPath(new URL('../', import.meta.url));
const directories: string[] = [];
after(() => { for (const dir of directories) rmSync(dir, { recursive: true, force: true }); });
function temporary(_t: TestContext) {
  const dir = mkdtempSync(join(tmpdir(), 'agent-persistence-'));
  directories.push(dir);
  return join(dir, 'runs.sqlite');
}
const failDraft: StepExecutor = async input => input.step.id === 'draft' ? { ok: false, error: '실패 예시' } : demoExecutor(input);
function cli(path: string, ...args: string[]) {
  return spawnSync(process.execPath, ['--import', 'tsx', 'src/workflow/cli.ts', ...args], {
    cwd, encoding: 'utf8', timeout: 15000,
    env: { PATH: process.env.PATH, AGENT_RUNTIME_DB: path, OPENAI_API_KEY: 'SECRET_NOT_STORED', LANGSMITH_TRACING: 'true' },
  });
}

test('DB를 다시 열어 실패 기록을 재개하고 완료 단계를 호출하지 않음', async t => {
  const path = temporary(t);
  const first = new SqliteWorkflowStore(path);
  const original = await runWorkflow(definition, '저장할 목표', failDraft, undefined, { store: first, mode: 'demo' });
  first.close();
  const store = new SqliteWorkflowStore(path); t.after(() => store.close());
  assert.deepEqual(store.get(original.runId), original);
  const calls: string[] = [];
  const resumed = await resumeWorkflow(original.runId, async input => {
    calls.push(input.step.id); assert.equal(input.goal, '저장할 목표');
    assert.equal(input.previous[0]?.output, original.steps[0]?.output);
    return demoExecutor(input);
  }, undefined, { store, mode: 'demo' });
  assert.deepEqual(calls, ['draft', 'review']);
  assert.equal(resumed.status, 'Completed'); assert.equal(resumed.parentRunId, original.runId);
  assert.notEqual(resumed.runId, original.runId);
  assert.deepEqual(store.get(original.runId), original);
  assert.deepEqual(store.get(resumed.runId), resumed);
  assert.equal(resumed.steps[1]?.error, undefined);
  assert.ok(resumed.events.every(e => e.stepId !== 'plan'));
  assert.equal(store.list().length, 2);
});

test('새 정의와 무관하게 저장된 snapshot의 단계와 공급자를 사용', async t => {
  const store = new SqliteWorkflowStore(temporary(t)); t.after(() => store.close());
  const source = structuredClone(definition); source.steps[1]!.provider = 'gemini';
  const original = await runWorkflow(source, '원래 목표', failDraft, undefined, { store, mode: 'demo' });
  source.steps.length = 0;
  const seen: string[] = [];
  const resumed = await resumeWorkflow(original.runId, async input => {
    seen.push(`${input.step.id}:${input.step.provider}`); return demoExecutor(input);
  }, undefined, { store, mode: 'demo' });
  assert.deepEqual(seen, ['draft:gemini', 'review:openai']);
  assert.deepEqual(resumed.snapshot, original.snapshot);
});

test('저장 장애 시 다음 모델 호출 전에 중단하며 원시 저장 오류를 노출하지 않음', async t => {
  const store = new SqliteWorkflowStore(temporary(t)); t.after(() => store.close());
  let saves = 0; const calls: string[] = [];
  const failing: WorkflowStore = { get: id => store.get(id), list: () => store.list(), save: run => {
    if (++saves === 4) throw new Error('SECRET DISK ERROR'); store.save(run);
  } };
  await assert.rejects(runWorkflow(definition, '목표', async input => {
    calls.push(input.step.id); return demoExecutor(input);
  }, undefined, { store: failing, mode: 'demo' }), /실행 결과를 저장하지 못해/);
  assert.deepEqual(calls, ['plan']);
  const saved = store.get(store.list()[0]!.runId)!;
  assert.equal(saved.steps[0]?.status, 'Completed'); assert.equal(saved.steps[1]?.status, 'Pending');
  assert.ok(!JSON.stringify(saved).includes('SECRET'));
});

test('모드 불일치·완료 기록·없는 ID는 실행 없이 거부', async t => {
  const store = new SqliteWorkflowStore(temporary(t)); t.after(() => store.close());
  const failed = await runWorkflow(definition, '목표', failDraft, undefined, { store, mode: 'demo' });
  let calls = 0; const execute: StepExecutor = async () => { calls++; return { ok: true, text: '결과' }; };
  await assert.rejects(resumeWorkflow(failed.runId, execute, undefined, { store, mode: 'live' }), /모드/);
  await assert.rejects(resumeWorkflow('missing', execute, undefined, { store, mode: 'demo' }), /ID/);
  const done = await runWorkflow(definition, '목표', demoExecutor, undefined, { store, mode: 'demo' });
  await assert.rejects(resumeWorkflow(done.runId, execute, undefined, { store, mode: 'demo' }), /완료/);
  assert.equal(calls, 0); assert.equal(store.list().length, 2);
});

test('손상된 저장 상태는 재개하지 않음', async t => {
  const path = temporary(t); const store = new SqliteWorkflowStore(path); t.after(() => store.close());
  const original = await runWorkflow(definition, '목표', failDraft, undefined, { store, mode: 'demo' });
  const bad = structuredClone(original); bad.steps[0]!.status = 'Pending';
  assert.throws(() => parseRunRecord(bad), /형식/);
  const db = new DatabaseSync(path);
  db.prepare('UPDATE workflow_runs SET record = ? WHERE run_id = ?').run('{broken', original.runId); db.close();
  await assert.rejects(resumeWorkflow(original.runId, demoExecutor, undefined, { store, mode: 'demo' }), /손상/);
});

test('CLI 실패·목록·상세·재개는 별도 프로세스에서 동작하고 설정 값을 저장하지 않음', t => {
  const path = temporary(t);
  const failed = cli(path, '--demo', '--fail-at', 'draft', '재개 실습');
  assert.equal(failed.status, 1, failed.stderr); assert.match(failed.stdout, /Failed/);
  const id = /실행 ID: ([\da-f-]+)/.exec(failed.stdout)![1]!;
  const listed = cli(path, '--list'); assert.equal(listed.status, 0); assert.ok(listed.stdout.includes(id));
  const shown = cli(path, '--list', id); assert.equal(shown.status, 0); assert.match(shown.stdout, /데모 계획/);
  const resumed = cli(path, '--demo', '--resume', id);
  assert.equal(resumed.status, 0, resumed.stderr); assert.match(resumed.stdout, /워크플로: Completed/);
  assert.ok(!resumed.stderr.includes('[Running] plan')); assert.match(resumed.stderr, /\[Running\] draft/);
  const store = new SqliteWorkflowStore(path); t.after(() => store.close());
  for (const summary of store.list()) assert.ok(!JSON.stringify(store.get(summary.runId)).includes('SECRET_NOT_STORED'));
});

test('실행 프로세스 강제 종료 후 명시적 복구로 완료 결과만 재사용', t => {
  const path = temporary(t);
  const script = `
    import definition from './workflows/content.json' with {type:'json'};
    import { runWorkflow } from './src/workflow/runner.ts';
    import { SqliteWorkflowStore } from './src/workflow/sqlite-store.ts';
    const store = new SqliteWorkflowStore(process.env.AGENT_RUNTIME_DB);
    await runWorkflow(definition, '중단된 목표', async ({step}) => {
      if (step.id === 'draft') process.exit(77);
      return {ok:true,text:'종료 전 저장된 계획'};
    }, undefined, {store,mode:'demo'});
  `;
  const crashed = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
    cwd, encoding: 'utf8', timeout: 15000, env: { PATH: process.env.PATH, AGENT_RUNTIME_DB: path },
  });
  assert.equal(crashed.status, 77, crashed.stderr);
  const store = new SqliteWorkflowStore(path);
  const id = store.list()[0]!.runId;
  assert.deepEqual(store.get(id)!.steps.map(s => s.status), ['Completed', 'Running', 'Pending']); store.close();
  const denied = cli(path, '--demo', '--resume', id);
  assert.equal(denied.status, 1); assert.match(denied.stderr, /--recover/);
  const recovered = cli(path, '--demo', '--resume', id, '--recover');
  assert.equal(recovered.status, 0, recovered.stderr); assert.match(recovered.stdout, /종료 전 저장된 계획/);
  assert.ok(!recovered.stderr.includes('[Running] plan')); assert.match(recovered.stdout, /워크플로: Completed/);
});
