import { providerId, resolveSettings } from './providers/config.js';
import { factchat } from './providers/factchat.js';
import { AgentError, type ModelResult } from "./types.js";
import { openai } from "./providers/openai.js";
import { gemini } from "./providers/gemini.js";
import type { Transport } from "./providers/http.js";

export async function runModel(provider: string, prompt: string, env: NodeJS.ProcessEnv = process.env, transport: Transport = fetch, options: { system?: string; signal?: AbortSignal; responseSchema?: Record<string, unknown> } = {}): Promise<ModelResult> {
  providerId(provider);
  if (!prompt.trim() || prompt.length > 10_000) throw new AgentError("요청은 공백을 제외한 내용이 있고 UTF-16 기준 10,000 이하여야 합니다.");
  const settings = resolveSettings(provider, env);
  if (options.responseSchema && settings.backend === 'direct' && settings.provider === 'gemini')
    throw new AgentError('구조화 실행은 Gemini 본사 API를 아직 지원하지 않습니다. 학교 Gateway 설정을 사용하세요.');
  const adapter = settings.backend === 'factchat' ? factchat(settings, transport)
    : settings.provider === 'openai' ? openai(settings, transport) : gemini(settings, transport);
  return adapter.generate({
    ...(options.responseSchema ? { responseSchema: options.responseSchema } : {}),
    prompt, system: options.system ?? "사용자의 요청을 정확하게 수행하고 한국어로 답하세요.", maxTokens: settings.backend === 'factchat' ? 16384 : 4096, ...(options.signal ? { signal: options.signal } : {}),
  });
}
