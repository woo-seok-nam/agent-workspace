import { randomUUID } from 'node:crypto';
import { mkdir, open, rename, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
export class ExecutionSaveError extends Error {
  constructor() { super('실행 기록 저장에 실패하여 중단했습니다. 디스크 공간과 폴더 쓰기 권한을 확인하세요.'); }
}
/** Single-writer replacement: readers see the previous or complete new JSON, not half a write. */
export async function atomicWrite(path: string, text: string): Promise<void> {
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await mkdir(dirname(path), { recursive: true });
    const handle = await open(temporary, 'wx', 0o600);
    try { await handle.writeFile(text, 'utf8'); await handle.sync(); } finally { await handle.close(); }
    await rename(temporary, path);
  } catch { throw new ExecutionSaveError(); }
  finally { await rm(temporary, { force: true }).catch(() => {}); }
}
