import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { SqliteWorkflowStore } from '../workflow/sqlite-store.js';
import { createService } from './service.js';
import { serve } from './serve.js';
import { METHODS, type Message } from './protocol.js';
for (const key of ['LANGSMITH_TRACING_V2','LANGCHAIN_TRACING_V2','LANGSMITH_TRACING','LANGCHAIN_TRACING']) process.env[key] = '';
// stdout은 JSONL 전용. 출력 오류 시 재실행하지 않고 프로세스를 종료합니다.
process.stdout.on('error', () => process.exit(1));
let store: SqliteWorkflowStore | undefined;
try {
  store = new SqliteWorkflowStore(resolve(process.env.AGENT_RUNTIME_DB?.trim() || fileURLToPath(new URL('../../.local/agent-runtime.sqlite', import.meta.url))));
  const send = (message: Message) => { process.stdout.write(JSON.stringify(message) + '\n'); };
  const handle = createService(store, send);
  send({ protocolVersion: 1, type: 'ready', methods: METHODS });
  await serve(process.stdin, handle, send, async () => {
    if (process.stdout.writableNeedDrain) await new Promise<void>(resolve => process.stdout.once('drain', resolve));
  });
} catch {
  process.stderr.write('Sidecar 시작/통신 오류: 실행 DB 경로와 프로세스 연결을 확인하세요.\n');
  process.exitCode = 1;
} finally { store?.close(); }
