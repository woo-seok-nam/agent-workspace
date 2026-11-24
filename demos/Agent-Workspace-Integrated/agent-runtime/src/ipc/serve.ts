import { readFrames } from './framing.js';
import { errorResponse, type Message } from './protocol.js';

// 실행 중에도 입력을 읽고 cancel/get/list를 처리합니다.
// 동시 실행은 service에서 1건으로 제한. EOF 후에는 처리 완료를 기다립니다.
export async function serve(input: AsyncIterable<Buffer | string>, handle: (line: string) => Promise<void>,
  send: (message: Message) => void, drain: () => Promise<void> = async () => {}) {
  const pending = new Set<Promise<void>>();
  let failed = false;
  try {
    for await (const frame of readFrames(input)) {
      if ('error' in frame) send(errorResponse(null, frame.error, '요청은 UTF-8 JSON 한 줄, 최대 65,536바이트여야 합니다.'));
      else if (frame.line.trim()) {
        const task = handle(frame.line).catch(() => { failed = true; }).finally(() => pending.delete(task));
        pending.add(task);
      }
      await drain();
    }
  } finally { await Promise.all(pending); }
  if (failed) throw new Error('Sidecar response failure');
}
