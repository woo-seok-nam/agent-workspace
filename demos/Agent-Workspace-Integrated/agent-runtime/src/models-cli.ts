import { listFactchatModels } from './providers/factchat.js';
import { AgentError } from './types.js';
try {
  const models = await listFactchatModels(process.env);
  console.table(models);
  console.log('반환된 id를 OPENAI_MODEL / GEMINI_MODEL / CLAUDE_MODEL에 입력하세요. 모델 가용성과 기능은 계정별로 다를 수 있습니다.');
} catch (e) { console.error(e instanceof AgentError ? e.message : '모델 조회 오류'); process.exitCode = 1; }
