import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import definition from '../../workflows/content-tools.json' with { type: 'json' };
import { runWorkflow, resumeWorkflow } from './runner.js';
import { demoExecutor } from './executors.js';
import { SqliteWorkflowStore } from './sqlite-store.js';
for (const key of ['LANGSMITH_TRACING_V2','LANGCHAIN_TRACING_V2','LANGSMITH_TRACING','LANGCHAIN_TRACING']) process.env[key] = '';

const store = new SqliteWorkflowStore(resolve(process.env.AGENT_RUNTIME_DB?.trim() || fileURLToPath(new URL('../../.local/agent-runtime.sqlite', import.meta.url))));
const controller = new AbortController();
try {
  console.log('[DEMO] API 호출 없음. 초안의 모의 대기 중 자동 취소하고 저장 결과로 재개합니다.');
  const cancelled = await runWorkflow(definition, '캡스톤 프로젝트 개발 계획', async input => {
    if (input.step.id === 'draft') {
      const timer = setTimeout(() => controller.abort(), 200);
      try { await delay(5000, undefined, { signal: input.signal }); }
      finally { clearTimeout(timer); }
    }
    return demoExecutor(input);
  }, e => console.log(`[${e.status}] ${e.stepId}`), { store, mode: 'demo', signal: controller.signal });
  assert.equal(cancelled.status, 'Cancelled');
  assert.deepEqual(cancelled.steps.map(s => s.status), ['Completed', 'Cancelled', 'Skipped']);
  console.log(`\n취소 실행 ID: ${cancelled.runId}`);
  console.log('계획 결과 보존:', cancelled.steps[0]!.output);
  console.log('\n[재개] 완료된 plan을 재사용하고 draft부터 실행합니다.');
  const resumed = await resumeWorkflow(cancelled.runId, demoExecutor, e => console.log(`[${e.status}] ${e.stepId}`), { store, mode: 'demo' });
  assert.equal(resumed.status, 'Completed');
  assert.deepEqual(resumed.steps[0], cancelled.steps[0]);
  assert.equal(store.get(cancelled.runId)?.status, 'Cancelled');
  console.log(`재개 실행 ID: ${resumed.runId} / ${resumed.status}`);
  console.log('CANCEL DEMO PASS');
} catch {
  console.error('취소/재개 데모에 실패했습니다. DB 경로·권한과 테스트 결과를 확인하세요.');
  process.exitCode = 1;
} finally { store.close(); }
