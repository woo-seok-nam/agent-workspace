import { backend, resolveSettings, PREFIXES, PROVIDERS } from './providers/config.js';
import { AgentError } from './types.js';
// Presence/configuration only; never display keys or model values.
try {
  console.log(`연결 방식: ${backend(process.env)}`);
  for (const provider of PROVIDERS) {
    try { resolveSettings(provider, process.env); console.log(`${PREFIXES[provider]}: 설정 있음 (실제 인증은 호출 시 확인)`); }
    catch (e) { console.log(`${PREFIXES[provider]}: 설정 필요 (${e instanceof AgentError ? e.message : '설정 오류'})`); }
  }
} catch { console.error('AI_BACKEND 설정을 확인하세요.'); process.exitCode = 1; }
