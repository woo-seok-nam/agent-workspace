import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseRunRecord, type WorkflowRun, type WorkflowStore, type RunSummary } from './records.js';
import { AgentError } from '../types.js';

/** Development-only persistence adapter; product persistence belongs to Rust Core. */
export class SqliteWorkflowStore implements WorkflowStore {
  private db: DatabaseSync;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    try {
      this.db.exec('PRAGMA busy_timeout = 5000; PRAGMA synchronous = FULL;');
      const version = this.db.prepare('PRAGMA user_version').get()?.user_version;
      if (version !== 0 && version !== 1) throw new AgentError('지원하지 않는 실행 DB 버전입니다.');
      this.db.exec(`CREATE TABLE IF NOT EXISTS workflow_runs (
        run_id TEXT PRIMARY KEY, updated_at TEXT NOT NULL, record TEXT NOT NULL
      ) STRICT; PRAGMA user_version = 1;`);
    } catch (e) { this.db.close(); throw e; }
  }
  save(run: WorkflowRun) {
    const valid = parseRunRecord(run);
    // 한 단계 상태와 결과를 단일 원자적 쓰기로 저장합니다.
    this.db.prepare(`INSERT INTO workflow_runs (run_id, updated_at, record) VALUES (?, ?, ?)
      ON CONFLICT(run_id) DO UPDATE SET updated_at = excluded.updated_at, record = excluded.record`)
      .run(valid.runId, valid.updatedAt, JSON.stringify(valid));
  }
  get(runId: string) {
    const row = this.db.prepare('SELECT record FROM workflow_runs WHERE run_id = ?').get(runId);
    if (!row) return undefined;
    return this.decode(row.record);
  }
  list(): RunSummary[] {
    return this.db.prepare('SELECT record FROM workflow_runs ORDER BY updated_at DESC, run_id DESC LIMIT 100').all().map(row => {
      const { runId, parentRunId, mode, status, startedAt, updatedAt } = this.decode(row.record);
      return { runId, mode, status, startedAt, updatedAt, ...(parentRunId ? { parentRunId } : {}) };
    });
  }
  private decode(value: unknown) {
    try { return parseRunRecord(JSON.parse(String(value))); }
    catch { throw new AgentError('저장된 실행 데이터가 손상되었거나 지원하지 않는 형식입니다.'); }
  }
  close() { this.db.close(); }
}
