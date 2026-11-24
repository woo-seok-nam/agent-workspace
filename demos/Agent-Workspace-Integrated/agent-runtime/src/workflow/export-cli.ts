import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { z } from 'zod';
import { SqliteWorkflowStore } from './sqlite-store.js';
import { exportRun } from './artifacts.js';
import { AgentError } from '../types.js';

const args = process.argv.slice(2);
let store: SqliteWorkflowStore | undefined;
try {
  if (args.length !== 1 || !z.uuid().safeParse(args[0]).success)
    throw new AgentError('사용법: npm.cmd run export -- 실행ID (npm.cmd run runs로 ID 확인)');
  const dbPath = resolve(process.env.AGENT_RUNTIME_DB?.trim() || fileURLToPath(new URL('../../.local/agent-runtime.sqlite', import.meta.url)));
  if (!existsSync(dbPath)) throw new AgentError('실행 DB가 없습니다. 먼저 workflow:demo를 실행하세요.');
  store = new SqliteWorkflowStore(dbPath);
  const run = store.get(args[0]!);
  if (!run) throw new AgentError('실행 ID를 찾을 수 없습니다. npm.cmd run runs로 확인하세요.');
  const artifact = exportRun(run, join(dirname(dbPath), 'artifacts'));
  console.log(`[내보내기 완료] ${run.status} / ${run.mode} / API 호출 없음`);
  if (run.status === 'Failed') console.log('실패한 실행의 부분 결과를 저장했습니다.');
  console.log(`문서: ${artifact.reportPath}`);
  console.log(`실행 데이터: ${artifact.jsonPath}`);
  console.log(`파일 정보: ${artifact.manifestPath}`);
} catch (e) {
  console.error(e instanceof AgentError ? e.message : '결과를 내보내지 못했습니다. 실행 DB와 저장 경로를 확인하세요.');
  process.exitCode = 1;
} finally { store?.close(); }
