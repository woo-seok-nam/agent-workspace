import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import definition from '../workflows/content.json' with { type: 'json' };
import { runWorkflow, rerunWorkflow } from '../src/workflow/runner.js';
import { SqliteWorkflowStore } from '../src/workflow/sqlite-store.js';
import { exportRun } from '../src/workflow/artifacts.js';
import { demoExecutor } from '../src/workflow/executors.js';
for (const k of ['LANGSMITH_TRACING_V2', 'LANGCHAIN_TRACING_V2', 'LANGSMITH_TRACING', 'LANGCHAIN_TRACING']) process.env[k] = '';
function folder(t: TestContext) {
  const path = mkdtempSync(join(tmpdir(), 'agent-artifacts-'));
  t.after(() => rmSync(path, { recursive: true, force: true })); return path;
}

test('결과 문서·JSON·manifest는 재실행 원본과 한국어 결과를 보존', async t => {
  const root = folder(t), store = new SqliteWorkflowStore(':memory:');
  t.after(() => store.close());
  const original = await runWorkflow(definition, '캡스톤 목표 😀', demoExecutor, undefined, { store, mode: 'demo' });
  const run = await rerunWorkflow(original.runId, 'draft', demoExecutor, undefined, { store, mode: 'demo' });
  const result = exportRun(run, root);
  assert.deepEqual(JSON.parse(readFileSync(result.jsonPath, 'utf8')), run);
  const report = readFileSync(result.reportPath, 'utf8');
  for (const value of [run.goal, original.runId, '다시 실행한 시작 단계: draft', 'DEMO', 'plan (Completed)', 'draft (Completed)', 'review (Completed)']) assert.ok(report.includes(value));
  const manifest = JSON.parse(readFileSync(result.manifestPath, 'utf8'));
  assert.equal(manifest.runId, run.runId); assert.equal(manifest.artifactId, result.artifactId);
  for (const entry of manifest.files) {
    const data = readFileSync(join(result.directory, entry.name));
    assert.equal(data.length, entry.bytes);
    assert.equal(createHash('sha256').update(data).digest('hex'), entry.sha256);
  }
  assert.deepEqual(store.get(original.runId), original); assert.deepEqual(store.get(run.runId), run);
});

test('실패한 실행은 부분 결과로 표시하고 Skipped를 결과로 꾸미지 않음', async t => {
  const root = folder(t);
  const run = await runWorkflow(definition, '목표', async input => input.step.id === 'draft' ? { ok: false, error: '요청 실패' } : demoExecutor(input), undefined, { mode: 'demo' });
  const report = readFileSync(exportRun(run, root).reportPath, 'utf8');
  assert.match(report, /실패한 실행의 부분 결과/); assert.match(report, /draft \(Failed\)/);
  assert.match(report, /review \(Skipped\)/); assert.match(report, /실행하지 않은 단계입니다/);
});

test('반복 내보내기는 새 폴더를 만들며 편집한 이전 파일을 덮어쓰지 않음', async t => {
  const root = folder(t), run = await runWorkflow(definition, '목표', demoExecutor, undefined, { mode: 'demo' });
  const first = exportRun(run, root); writeFileSync(first.reportPath, '사용자가 편집한 결과', 'utf8');
  const second = exportRun(run, root);
  assert.notEqual(first.directory, second.directory);
  assert.equal(readFileSync(first.reportPath, 'utf8'), '사용자가 편집한 결과');
  assert.match(readFileSync(second.reportPath, 'utf8'), /워크플로 실행 결과/);
  assert.equal(readdirSync(join(root, run.runId)).length, 2);
});

test('Running·변조된 경로 ID·저장 불가능 경로는 성공 파일을 만들지 않음', async t => {
  const root = folder(t), run = await runWorkflow(definition, '목표', demoExecutor, undefined, { mode: 'demo' });
  assert.throws(() => exportRun({ ...run, status: 'Running' }, root), /실행 중/);
  assert.throws(() => exportRun({ ...run, runId: '../escape' }, root), /형식/);
  assert.deepEqual(readdirSync(root), []);
  const file = join(root, 'existing.txt'); writeFileSync(file, '원래 내용');
  assert.throws(() => exportRun(run, file), /저장하지 못했습니다/);
  assert.equal(readFileSync(file, 'utf8'), '원래 내용');
});

test('모델이 만든 Markdown·HTML·긴 백틱도 문서에서 원문으로 보존', async t => {
  const text = '```\n# 가짜 제목\n``````\n<img src="https://invalid.example/test.png">';
  const run = await runWorkflow(definition, text, async () => ({ ok: true, text }), undefined, { mode: 'demo' });
  const report = readFileSync(exportRun(run, folder(t)).reportPath, 'utf8');
  assert.ok(report.includes('```````text\n' + text + '\n```````'));
  assert.ok(report.includes('### review (Completed)'));
});

test('별도 CLI는 API 설정 없이 내보내고 없는 ID를 오류 처리', async t => {
  const root = folder(t), dbPath = join(root, 'runs.sqlite'), store = new SqliteWorkflowStore(dbPath);
  const run = await runWorkflow(definition, '내보내기 목표', demoExecutor, undefined, { store, mode: 'demo' });
  store.close();
  const cli = (id: string) => spawnSync(process.execPath, ['--import', 'tsx', 'src/workflow/export-cli.ts', id], {
    cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8', timeout: 15000,
    env: { PATH: process.env.PATH, AGENT_RUNTIME_DB: dbPath, OPENAI_API_KEY: 'SECRET_NOT_FOR_EXPORT' },
  });
  const result = cli(run.runId); assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /API 호출 없음/);
  const reportPath = /^문서: (.+)$/m.exec(result.stdout)![1]!;
  assert.ok(existsSync(reportPath)); assert.ok(!readFileSync(reportPath, 'utf8').includes('SECRET_NOT_FOR_EXPORT'));
  const missing = cli('00000000-0000-4000-8000-000000000000'); assert.equal(missing.status, 1); assert.match(missing.stderr, /찾을 수 없습니다/);
  assert.deepEqual(readdirSync(join(root, 'artifacts')), [run.runId]);
});
