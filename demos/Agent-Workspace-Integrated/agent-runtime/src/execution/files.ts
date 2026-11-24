import { open } from 'node:fs/promises';
import { basename, dirname, extname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { ExecutionInput } from './run.js';

const fileMap = z.record(z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/), z.array(z.string().min(1)).min(1).max(20));
export interface SourceFile { id: string; port: string; name: string; sha256: string; bytes: number; lines: number }
export class InputFileError extends Error {}
// Bounded reads avoid loading huge files and reject directories/devices before reading.
async function readBounded(path: string, limit: number): Promise<Buffer> {
  let handle;
  try {
    handle = await open(path, 'r');
    const info = await handle.stat();
    if (!info.isFile()) throw new InputFileError('일반 파일만 입력할 수 있습니다.');
    if (info.size > limit) throw new InputFileError('파일 크기 제한을 초과했습니다.');
    const buffer = Buffer.alloc(limit + 1);
    let count = 0;
    while (count < buffer.length) {
      const { bytesRead } = await handle.read(buffer, count, buffer.length - count, null);
      if (!bytesRead) break;
      count += bytesRead;
    }
    if (count > limit) throw new InputFileError('파일 크기 제한을 초과했습니다.');
    return buffer.subarray(0, count);
  } catch (e) {
    if (e instanceof InputFileError) throw e;
    throw new InputFileError('입력 파일을 열 수 없습니다. 경로와 접근 권한을 확인하세요.');
  } finally { await handle?.close(); }
}
function decode(bytes: Buffer): string {
  try {
    const value = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (value.includes('\0')) throw new Error();
    return value;
  } catch { throw new InputFileError('자료는 UTF-8 텍스트여야 합니다. VS Code에서 UTF-8로 저장하세요.'); }
}
export async function loadInputFiles(mappingPath: string, existing: unknown = {}): Promise<{ inputs: Record<string, string>; sources: SourceFile[] }> {
  const inputs = ExecutionInput.parse(existing);
  const mapping = fileMap.parse(JSON.parse(decode(await readBounded(mappingPath, 64000))));
  if (!Object.keys(mapping).length) throw new InputFileError('파일 입력 목록이 비어 있습니다.');
  if (Object.values(mapping).reduce((sum, paths) => sum + paths.length, 0) > 20) throw new InputFileError('자료 파일은 총 20개 이하여야 합니다.');
  for (const port of Object.keys(mapping)) if (Object.hasOwn(inputs, port)) throw new InputFileError('같은 포트를 --inputs와 --input-files에 중복 지정할 수 없습니다.');
  const sources: SourceFile[] = [];
  let total = 0;
  for (const [port, paths] of Object.entries(mapping)) {
    const chunks: string[] = [];
    for (const path of paths) {
      if (!['.txt', '.md'].includes(extname(path).toLowerCase())) throw new InputFileError('자료 파일은 .txt 또는 .md만 지원합니다.');
      const bytes = await readBounded(resolve(dirname(resolve(mappingPath)), path), 64000);
      total += bytes.length;
      if (total > 256000) throw new InputFileError('전체 자료는 256KB 이하여야 합니다.');
      const text = decode(bytes).replace(/\r\n?/g, '\n');
      if (!text.trim()) throw new InputFileError('빈 자료 파일은 사용할 수 없습니다.');
      const lines = text.split('\n'), id = `source_${sources.length + 1}`;
      const name = basename(path).replace(/[\r\n]/g, '_');
      sources.push({ id, port, name, bytes: bytes.length, lines: lines.length, sha256: createHash('sha256').update(bytes).digest('hex') });
      chunks.push(JSON.stringify({ source_id: id, file_name: name, content: lines.map((line, i) => `L${i + 1}: ${line}`).join('\n') }));
    }
    inputs[port] = chunks.join('\n');
  }
  // Do not truncate original evidence to fit budgets.
  if (Object.values(inputs).some(v => v.length > 20000)) throw new InputFileError('포트별 자료는 출처 표기를 포함해 20,000자 이하여야 합니다. 자료 범위를 줄여주세요.');
  return { inputs: ExecutionInput.parse(inputs), sources };
}
