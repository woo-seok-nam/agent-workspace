import { agents, type AgentId } from './agents.js';
import { createToolSession } from './providers/tool-session.js';
import { runToolLoop } from './tool-loop.js';
import { AgentError } from './types.js';
const [provider, agentId, ...words] = process.argv.slice(2);
try {
  if (!provider || !agentId || !Object.hasOwn(agents, agentId) || !words.length)
    throw new AgentError('사용법: npm.cmd run tools -- gemini reviewer "안녕 세상의 글자 수를 도구로 확인해줘"');
  const session = createToolSession(provider, words.join(' '), agents[agentId as AgentId].instructions + '\n글자·단어·줄 수는 text_stats 도구로 계산하세요. 도구 실패를 성공이라고 말하지 마세요.');
  console.error('[Running] 도구를 사용할 수 있는 Agent 실행');
  const result = await runToolLoop(session);
  console.error(`[${result.status}] 모델 호출 ${result.modelTurns}회 / 도구 처리 ${result.tools.length}회`);
  if (result.status === 'Completed') console.log(result.text);
  else { console.error(result.error); process.exitCode = 1; }
} catch (e) {
  console.error(e instanceof AgentError ? e.message : '내부 오류가 발생했습니다.'); process.exitCode = 1;
}
