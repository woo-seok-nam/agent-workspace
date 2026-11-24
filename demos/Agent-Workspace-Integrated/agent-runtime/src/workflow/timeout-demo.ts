import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import definition from '../../workflows/content-timeout.json' with { type: 'json' };
import { runWorkflow, resumeWorkflow } from './runner.js';
import { demoExecutor } from './executors.js';
import { SqliteWorkflowStore } from './sqlite-store.js';
for (const key of ['LANGSMITH_TRACING_V2','LANGCHAIN_TRACING_V2','LANGSMITH_TRACING','LANGCHAIN_TRACING']) process.env[key] = '';

let store: SqliteWorkflowStore | undefined;
try {
  store = new SqliteWorkflowStore(resolve(process.env.AGENT_RUNTIME_DB?.trim() || fileURLToPath(new URL('../../.local/agent-runtime.sqlite', import.meta.url))));
  console.log('[DEMO] API 호출 없음. draft를 5초 대기시켜 단계 제한 시간 1초를 초과하게 합니다.');
  const failed = await runWorkflow(definition, '캡스톤 프로젝트 개발 계획', async input => {
    if (input.step.id === 'draft') await delay(5000, undefined, { signal: input.signal });
    return demoExecutor(input);
  }, e => console.log(`[${e.status}] ${e.stepId}`), { store, mode: 'demo' });
  assert.equal(failed.status, 'Failed');
  assert.deepEqual(failed.steps.map(s => s.status), ['Completed', 'Failed', 'Skipped']);
  assert.equal(failed.steps[1]!.errorCode, 'STEP_TIMEOUT');
  console.log(`\n시간 초과 실행 ID: ${failed.runId}`);
  console.log(`오류 코드: ${failed.steps[1]!.errorCode}`);
  console.log(failed.steps[1]!.error);
  console.log('계획 결과 보존:', failed.steps[0]!.output);
  console.log('\n[재개] 모의 지연을 제거하고 완료된 plan을 재사용합니다.');
  const resumed = await resumeWorkflow(failed.runId, demoExecutor, e => console.log(`[${e.status}] ${e.stepId}`), { store, mode: 'demo' });
  assert.equal(resumed.status, 'Completed');
  assert.deepEqual(resumed.steps[0], failed.steps[0]);
  assert.deepEqual(resumed.snapshot, failed.snapshot);
  assert.equal(resumed.steps[1]!.errorCode, undefined);
  assert.equal(store.get(failed.runId)?.status, 'Failed');
  console.log(`재개 실행 ID: ${resumed.runId} / ${resumed.status}`);
  console.log('TIMEOUT DEMO PASS');
} catch {
  console.error('시간 초과/재개 데모에 실패했습니다. DB 경로·권한과 테스트 결과를 확인하세요.');
  process.exitCode = 1;
} finally { store?.close(); }
