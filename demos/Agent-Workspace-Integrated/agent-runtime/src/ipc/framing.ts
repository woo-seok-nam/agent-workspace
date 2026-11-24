export const MAX_FRAME_BYTES = 65536;
type Frame = { line: string } | { error: 'FRAME_TOO_LARGE' | 'INVALID_UTF8' };
// UTF-8 문자와 JSON 행이 임의 청크로 분할되어 들어와도 행 단위로 복원합니다.
export async function* readFrames(input: AsyncIterable<Buffer | string>): AsyncGenerator<Frame> {
  let parts: Buffer[] = [], bytes = 0, oversized = false;
  const add = (part: Buffer) => {
    if (oversized) return;
    bytes += part.length;
    if (bytes > MAX_FRAME_BYTES) { oversized = true; parts = []; }
    else parts.push(part);
  };
  const finish = (): Frame => {
    let result: Frame;
    if (oversized) result = { error: 'FRAME_TOO_LARGE' };
    else {
      try { result = { line: new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(parts)) }; }
      catch { result = { error: 'INVALID_UTF8' }; }
    }
    parts = []; bytes = 0; oversized = false; return result;
  };
  for await (const raw of input) {
    const chunk = typeof raw === 'string' ? Buffer.from(raw) : raw;
    let start = 0, end: number;
    while ((end = chunk.indexOf(10, start)) !== -1) {
      add(chunk.subarray(start, end)); yield finish(); start = end + 1;
    }
    if (start < chunk.length) add(chunk.subarray(start));
  }
  if (bytes || oversized) yield finish();
}
