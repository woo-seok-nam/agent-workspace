import { runToolLoop, type ToolSession } from './tool-loop.js';
const input = process.argv.slice(2).join(' ') || '안녕 세상';
console.log('[DEMO] 외부 API 호출 없음. 모델의 선택·답변은 정해진 시나리오이며 text_stats 도구는 실제 실행됩니다.');
let first = true;
const session: ToolSession = { async next(results) {
  if (first) { first = false; return { text: '', calls: [{ id: 'demo-1', name: 'text_stats', args: { text: input } }] }; }
  const result = results[0];
  if (!result?.ok) throw new Error('Demo tool failed');
  return { calls: [], text: `[데모 결과] 글자 ${result.data.characters}개, 공백 기준 단어 ${result.data.words}개, 줄 ${result.data.lines}개` };
}};
const result = await runToolLoop(session);
for (const event of result.events) console.log(`${event.step}: ${event.kind}${event.ok === undefined ? '' : ` (${event.ok ? '성공' : '실패'})`}`);
console.log(result.status === 'Completed' ? result.text : result.error);
process.exitCode = result.status === 'Completed' ? 0 : 1;
