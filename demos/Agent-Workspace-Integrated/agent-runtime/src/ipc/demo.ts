import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import definition from '../../workflows/content-tools.json' with { type: 'json' };
import { RunRecordSchema } from '../workflow/records.js';

console.log('[IPC DEMO] 별도 Node 프로세스와 통신합니다. API 호출은 없습니다.');
const child = spawn(process.execPath, ['--import', 'tsx', 'src/ipc/sidecar.ts'], {
  cwd: fileURLToPath(new URL('../../', import.meta.url)), stdio: ['pipe','pipe','pipe'],
});
let done = false, runId: string | undefined, originalRunId: string | undefined;
const timeout = setTimeout(() => { console.error('통신 데모 시간 초과'); child.kill(); process.exitCode = 1; }, 30000);
child.stderr.on('data', () => { /* raw child diagnostics are not echoed */ });
child.on('error', () => { console.error('Sidecar를 시작하지 못했습니다.'); clearTimeout(timeout); process.exitCode = 1; });
child.on('close', code => {
  clearTimeout(timeout);
  if (code !== 0 || !done) { console.error('IPC 데모가 완료되지 않았습니다.'); process.exitCode = 1; }
});
const input = createInterface({ input: child.stdout });
input.on('line', line => {
  try {
    const message = JSON.parse(line);
    if (message.protocolVersion !== 1) throw new Error('version');
    if (message.type === 'ready') {
      console.log('[연결 완료] 실행 요청 전송');
      child.stdin.write(JSON.stringify({ protocolVersion: 1, requestId: 'demo-start', method: 'run.start', params: {
        mode: 'demo', goal: process.argv.slice(2).join(' ') || '캡스톤 프로젝트 개발 계획', workflow: definition,
      } }) + '\n');
    } else if (message.type === 'event') console.log(`[진행] ${message.stepId}: ${message.status}`);
    else if (message.type === 'response') {
      if (!message.ok) throw new Error('rejected');
      const run = RunRecordSchema.parse(message.data?.run);
      if (message.requestId === 'demo-start') {
        if (run.status !== 'Completed') throw new Error('run failed');
        originalRunId = run.runId; console.log(`[실행 완료] ${originalRunId}`);
        child.stdin.write(JSON.stringify({ protocolVersion: 1, requestId: 'demo-rerun', method: 'run.rerun', params: { runId: originalRunId, mode: 'demo', stepId: 'review' } }) + '\n');
      } else if (message.requestId === 'demo-rerun') {
        if (run.parentRunId !== originalRunId || run.status !== 'Completed' || run.events.some(e => e.stepId !== 'review')) throw new Error('rerun mismatch');
        runId = run.runId; console.log(`[재실행 완료] 검토만 실행 / 새 실행 ID: ${runId}`);
        child.stdin.write(JSON.stringify({ protocolVersion: 1, requestId: 'demo-get', method: 'run.get', params: { runId } }) + '\n');
      } else if (message.requestId === 'demo-get') {
        if (run.runId !== runId || run.status !== 'Completed') throw new Error('mismatch');
        console.log('[조회 완료] 같은 프로세스에서 저장된 결과를 다시 받았습니다.');
        console.log(run.steps.at(-1)?.output); console.log('IPC DEMO PASS');
        done = true; child.stdin.end();
      }
    }
  } catch { console.error('통신 응답 또는 실행 결과 검증 실패'); child.kill(); process.exitCode = 1; }
});
