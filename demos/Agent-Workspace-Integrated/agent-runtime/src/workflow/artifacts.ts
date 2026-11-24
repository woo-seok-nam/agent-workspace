import { randomUUID, createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, writeFileSync, renameSync, rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseRunRecord, type WorkflowRun } from './records.js';
import { AgentError } from '../types.js';

// 모델 결과의 Markdown/HTML을 문서 구조로 실행하지 않고 원문으로 보존합니다.
function literal(value: string) {
  let longest = 0;
  for (const match of value.matchAll(/`+/g)) longest = Math.max(longest, match[0].length);
  const fence = '`'.repeat(Math.max(3, longest + 1));
  return `${fence}text\n${value}\n${fence}`;
}
export function renderReport(run: WorkflowRun) {
  const title = run.status === 'Cancelled' ? '취소한 실행의 부분 결과' : run.status === 'Attention' ? '사용자 승인 대기 중인 부분 결과' : run.status === 'Failed' ? '실패한 실행의 부분 결과' : '워크플로 실행 결과';
  const lines = [
    `# ${title}`, '',
    run.mode === 'demo' ? '> DEMO: 고정 시나리오의 결과입니다. 실제 AI가 작성한 문서가 아닙니다.' : '> LIVE: 저장된 모델 응답입니다. 내용의 정확성은 검토가 필요합니다.', '',
    `- 실행 ID: ${run.runId}`, `- 실행 상태: ${run.status}`, `- 실행 모드: ${run.mode}`,
    `- 시작 시각: ${run.startedAt}`, `- 마지막 저장 시각: ${run.updatedAt}`, `- 소요 시간: ${run.durationMs} ms`,
    ...(run.parentRunId ? [`- 원본 실행 ID: ${run.parentRunId}`] : []),
    ...(run.rerunFromStepId ? [`- 다시 실행한 시작 단계: ${run.rerunFromStepId}`] : []), '',
    '## 워크플로 이름', '', literal(run.snapshot.name), '',
    '## 사용자 목표', '', literal(run.goal), '',
    ...(run.approvedSteps?.length ? ['## 승인된 단계', '', literal(run.approvedSteps.join(', ')), ''] : []),
    ...(run.approval ? ['이번 실행의 승인 기록:', '', literal(JSON.stringify(run.approval)), ''] : []),
    '## 단계별 상태', '', '| 단계 | 역할 | 공급자 | 상태 |', '|---|---|---|---|',
    ...run.steps.map(s => `| ${s.id} | ${s.agent} | ${s.provider} | ${s.status} |`), '',
    '## 단계별 원문', '',
    '초안과 검토 의견을 각각 보존합니다. 검토 의견을 수정 완료된 최종 문서로 취급하지 않습니다.', '',
  ];
  for (const s of run.steps) {
    lines.push(`### ${s.id} (${s.status})`, '',
      ...(s.errorCode ? [`오류 코드: ${s.errorCode}`, ''] : []),
      ...(s.agentRunId ? ['Agent 실행 ID:', '', literal(s.agentRunId), ''] : []),
      literal(s.output ?? s.error ?? (s.status === 'Attention' ? '사용자 승인 대기 중입니다.' : '실행하지 않은 단계입니다.')), '');
    if (s.toolTrace) lines.push('도구 실행 기록:', '', literal(JSON.stringify(s.toolTrace, null, 2)), '');
  }
  return lines.join('\n');
}

/** 개발 CLI 어댑터. 제품 통합 시 파일 쓰기는 Rust Artifact Gateway가 담당합니다. */
export function exportRun(value: unknown, outputRoot: string) {
  const run = parseRunRecord(value);
  if (run.status === 'Running') throw new AgentError('실행 중인 기록은 내보낼 수 없습니다. 실행 종료 또는 복구 후 다시 시도하세요.');
  const artifactId = randomUUID();
  const parent = join(resolve(outputRoot), run.runId);
  const directory = join(parent, artifactId);
  const report = renderReport(run), json = JSON.stringify(run, null, 2) + '\n';
  const manifest = {
    artifactVersion: 1, artifactId, runId: run.runId, exportedAt: new Date().toISOString(),
    status: run.status, mode: run.mode,
    files: [{ name: 'report.md', mimeType: 'text/markdown', contents: report },
      { name: 'run.json', mimeType: 'application/json', contents: json }].map(({ name, mimeType, contents }) => ({
        name, mimeType, bytes: Buffer.byteLength(contents), sha256: createHash('sha256').update(contents).digest('hex'),
      })),
  };
  let staging: string | undefined;
  try {
    mkdirSync(parent, { recursive: true });
    staging = mkdtempSync(join(parent, '.export-'));
    writeFileSync(join(staging, 'report.md'), report, { encoding: 'utf8', flag: 'wx' });
    writeFileSync(join(staging, 'run.json'), json, { encoding: 'utf8', flag: 'wx' });
    writeFileSync(join(staging, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
    if (existsSync(directory)) throw new Error('Artifact ID collision');
    renameSync(staging, directory);
    staging = undefined;
    return { artifactId, directory, reportPath: join(directory, 'report.md'), jsonPath: join(directory, 'run.json'), manifestPath: join(directory, 'manifest.json') };
  } catch {
    throw new AgentError('결과 파일을 저장하지 못했습니다. 저장 경로·권한·디스크 공간을 확인하세요.');
  } finally {
    if (staging) { try { rmSync(staging, { recursive: true, force: true }); } catch { /* incomplete staging is never reported as success */ } }
  }
}
