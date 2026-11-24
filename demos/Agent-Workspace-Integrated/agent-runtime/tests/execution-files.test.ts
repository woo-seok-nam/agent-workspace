import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadInputFiles } from '../src/execution/files.js';
import { reportMarkdown, redactSecrets } from '../src/execution/report.js';
import { executeDraft } from '../src/execution/run.js';
import { DEMO_REQUEST, sampleDraft } from '../src/generator/demo.js';
async function workspace(fn: (dir: string) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), 'capdi-files-'));
  try { await fn(dir); } finally { await rm(dir, { recursive: true, force: true }); }
}
test('매핑 파일 기준 상대경로, 여러 자료, 줄 번호·해시 보존', async () => workspace(async dir => {
  await mkdir(join(dir, '자료'));
  await writeFile(join(dir, '자료', 'A.txt'), '첫 줄\r\n둘째 줄');
  await writeFile(join(dir, 'B.md'), '# 기획안 B');
  await writeFile(join(dir, 'files.json'), JSON.stringify({ source_materials: ['자료/A.txt', 'B.md'] }));
  const r = await loadInputFiles(join(dir, 'files.json'));
  assert.equal(r.sources.length, 2); assert.equal(r.sources[0]!.lines, 2);
  assert.match(r.sources[0]!.sha256, /^[a-f0-9]{64}$/);
  assert.match(r.inputs.source_materials!, /L2: 둘째 줄/); assert.match(r.inputs.source_materials!, /source_2/);
  assert.ok(!r.inputs.source_materials!.includes(dir));
}));
test('동일 포트 직접 입력과 파일 입력 충돌 차단', async () => workspace(async dir => {
  await writeFile(join(dir, 'files.json'), JSON.stringify({ source: ['A.txt'] }));
  await assert.rejects(loadInputFiles(join(dir, 'files.json'), { source: '기존 자료' }), /중복/);
}));
test('PDF·빈 파일·잘못된 UTF-8 차단', async () => workspace(async dir => {
  const map = join(dir, 'files.json');
  await writeFile(map, JSON.stringify({ source: ['A.pdf'] }));
  await assert.rejects(loadInputFiles(map), /txt 또는 .md/);
  await writeFile(map, JSON.stringify({ source: ['A.txt'] }));
  await writeFile(join(dir, 'A.txt'), '  ');
  await assert.rejects(loadInputFiles(map), /빈 자료/);
  await writeFile(join(dir, 'A.txt'), Buffer.from([0xff, 0xfe, 0x00]));
  await assert.rejects(loadInputFiles(map), /UTF-8/);
}));
test('과대 파일은 내용 잘림 없이 실패', async () => workspace(async dir => {
  await writeFile(join(dir, 'files.json'), JSON.stringify({ source: ['A.txt'] }));
  await writeFile(join(dir, 'A.txt'), 'a'.repeat(64001));
  await assert.rejects(loadInputFiles(join(dir, 'files.json')), /크기 제한/);
}));
test('없는 파일 및 디렉터리 입력은 실패', async () => workspace(async dir => {
  await writeFile(join(dir, 'files.json'), JSON.stringify({ source: ['missing.txt'] }));
  await assert.rejects(loadInputFiles(join(dir, 'files.json')), /열 수 없습니다/);
  await mkdir(join(dir, 'missing.txt'));
  await assert.rejects(loadInputFiles(join(dir, 'files.json')), /일반 파일/);
}));
test('빈 목록과 전체 파일 수 제한', async () => workspace(async dir => {
  const path = join(dir, 'files.json');
  await writeFile(path, '{}'); await assert.rejects(loadInputFiles(path), /비어/);
  await writeFile(path, JSON.stringify({ a: Array(20).fill('A.txt'), b: ['B.txt'] }));
  await assert.rejects(loadInputFiles(path), /20개/);
}));
test('파일 로드부터 실행·원본 검토·Markdown 결과까지 연결', async () => workspace(async dir => {
  await writeFile(join(dir, 'A.txt'), 'A 기획안 원문');
  await writeFile(join(dir, 'files.json'), JSON.stringify({ proposals: ['A.txt'] }));
  const loaded = await loadInputFiles(join(dir, 'files.json'), { requirements: '첨부 자료만 사용' });
  let reviewed = false;
  const result = await executeDraft({ outcome: 'draft', request: DEMO_REQUEST, response: sampleDraft() }, loaded.inputs, async raw => {
    const p = JSON.parse(raw); const review = p.task.kind === 'final_review';
    if (review) { assert.match(p.inputs.source, /L1: A 기획안 원문/); reviewed = true; }
    return JSON.stringify({ outputs: Object.fromEntries(p.output_ports.map((x: any) => [x.name, '# 보고서\n\n근거: source_1 L1'])), verdict: review ? 'pass' : null, issues: [] });
  }, new AbortController().signal);
  assert.equal(result.status, 'completed'); assert.ok(reviewed); assert.match(reportMarkdown(result)!, /^# 보고서/);
  result.status = 'needs_review'; assert.equal(reportMarkdown(result), null);
}));
test('Markdown·JSON 저장에 사용하는 비밀정보 제거', () => {
  assert.equal(redactSecrets('보고서 abcdef-key', { FACTCHAT_API_KEY: 'abcdef-key' }), '보고서 [REDACTED]');
});
