import { AgentError, type ProviderId } from '../types.js';
export const PROVIDERS = ['openai', 'gemini', 'claude'] as const;
export const PREFIXES = { openai: 'OPENAI', gemini: 'GEMINI', claude: 'CLAUDE' } as const;
export const DEFAULT_FACTCHAT_URL = 'https://factchat-cloud.mindlogic.ai/v1/gateway';
export function providerId(value: string): ProviderId {
  if (!PROVIDERS.includes(value as ProviderId)) throw new AgentError('공급자는 openai, gemini, claude 중 하나를 입력하세요.');
  return value as ProviderId;
}
export function backend(env: NodeJS.ProcessEnv): 'factchat' | 'direct' {
  const mode = env.AI_BACKEND?.trim() || (env.FACTCHAT_API_KEY?.trim() || env.FACTCHAT_BASE_URL?.trim() ? 'factchat' : 'direct');
  if (mode !== 'factchat' && mode !== 'direct') throw new AgentError('AI_BACKEND는 factchat 또는 direct여야 합니다.');
  return mode;
}
export function factchatEndpoint(baseUrl: string, route: 'chat/completions' | 'models'): string {
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error();
    const path = url.pathname.replace(/\/+$/, '');
    // Accept only the documented gateway base path, never a dashboard/chat page.
    if (path !== '/v1/gateway') throw new Error();
    return `${url.origin}${path}/${route}/`;
  } catch { throw new AgentError('FACTCHAT_BASE_URL은 HTTPS Gateway 기본 주소여야 합니다. 채팅 화면 URL을 넣지 마세요.'); }
}
export function factchatCredentials(env: NodeJS.ProcessEnv) {
  const key = env.FACTCHAT_API_KEY?.trim();
  if (!key) throw new AgentError('.env에 FACTCHAT_API_KEY를 입력하세요.');
  const baseUrl = env.FACTCHAT_BASE_URL?.trim() || DEFAULT_FACTCHAT_URL;
  factchatEndpoint(baseUrl, 'chat/completions');
  return { key, baseUrl };
}
export function resolveSettings(provider: string, env: NodeJS.ProcessEnv, modelOverride?: string) {
  const id = providerId(provider), prefix = PREFIXES[id], mode = backend(env);
  const model = modelOverride?.trim() || env[`${prefix}_MODEL`]?.trim();
  if (!model) throw new AgentError(`.env에 ${prefix}_MODEL을 입력하세요. 생성기에는 WORKFLOW_MODEL도 사용할 수 있습니다.`);
  if (mode === 'factchat') return { ...factchatCredentials(env), model, provider: id, backend: mode };
  if (id === 'claude') throw new AgentError('Claude는 현재 학교 Gateway로 지원합니다. AI_BACKEND=factchat과 FACTCHAT_API_KEY를 설정하세요.');
  const key = env[`${prefix}_API_KEY`]?.trim();
  if (!key) throw new AgentError(`.env에 ${prefix}_API_KEY를 입력하세요.`);
  return { key, model, provider: id, backend: mode, baseUrl: null };
}
