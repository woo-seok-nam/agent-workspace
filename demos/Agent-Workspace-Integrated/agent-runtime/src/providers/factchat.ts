import { AgentError, type Provider, type ProviderId } from '../types.js';
import { array, object, post, requireText, text, type Transport } from './http.js';
import { factchatCredentials, factchatEndpoint } from './config.js';
import { toolDefinitions, type ToolCall } from '../tools/registry.js';
import type { ToolSession } from '../tool-loop.js';
export interface FactchatSettings { key: string; model: string; baseUrl: string; provider: ProviderId }
export function chatChoice(data: Record<string, unknown>, toolsAllowed = false) {
  const choice = object(array(data.choices)[0]), message = object(choice.message);
  if (message.refusal) throw new AgentError('학교 AI 모델이 요청을 거절했습니다.');
  if (choice.finish_reason !== 'stop' && !(toolsAllowed && choice.finish_reason === 'tool_calls'))
    throw new AgentError('학교 AI 응답이 정상 완료되지 않았습니다. 출력 한도·모델 지원 여부를 확인하세요.');
  if (array(message.tool_calls).length && (!toolsAllowed || choice.finish_reason !== 'tool_calls'))
    throw new AgentError('예상하지 않은 도구 호출 응답입니다.');
  return { choice, message };
}
export function factchat(settings: FactchatSettings, transport: Transport = fetch): Provider {
  return { async generate(r) {
    const data = await post(factchatEndpoint(settings.baseUrl, 'chat/completions'), { Authorization: `Bearer ${settings.key}` }, {
      model: settings.model, messages: [{ role: 'system', content: r.system }, { role: 'user', content: r.prompt }],
      stream: false, max_tokens: r.maxTokens,
      ...(r.responseSchema ? { response_format: { type: 'json_schema', json_schema: { name: 'workflow_step', strict: true, schema: r.responseSchema } } } : {}),
    }, transport, r.signal);
    const { message } = chatChoice(data);
    return { provider: settings.provider, model: settings.model, text: requireText(text(message.content)) };
  } };
}
export function factchatToolSession(settings: FactchatSettings, prompt: string, system: string, transport: Transport, signal?: AbortSignal): ToolSession {
  const history: unknown[] = [{ role: 'system', content: system }, { role: 'user', content: prompt }];
  let pending: ToolCall[] = [];
  return { async next(results) {
    if (results.length !== pending.length || results.some((r, i) => r.id !== pending[i]?.id || r.name !== pending[i]?.name))
      throw new AgentError('도구 호출과 결과의 연결이 일치하지 않습니다.');
    history.push(...results.map(r => ({ role: 'tool', tool_call_id: r.id, content: JSON.stringify(r.ok ? { ok: true, data: r.data } : { ok: false, code: r.code }) })));
    const data = await post(factchatEndpoint(settings.baseUrl, 'chat/completions'), { Authorization: `Bearer ${settings.key}` }, {
      model: settings.model, messages: history, max_tokens: 16384, stream: false,
      tools: toolDefinitions.map(t => ({ type: 'function', function: { ...t, strict: true } })),
    }, transport, signal);
    const { choice, message } = chatChoice(data, true);
    const calls = array(message.tool_calls).map(raw => {
      const call = object(raw), fn = object(call.function);
      if (call.type !== 'function') throw new AgentError('지원하지 않는 도구 호출 형식입니다.');
      let args: unknown;
      try { args = JSON.parse(text(fn.arguments)); } catch { throw new AgentError('도구 인수가 올바른 JSON이 아닙니다.'); }
      return { id: text(call.id), name: text(fn.name), args };
    });
    if (choice.finish_reason === 'tool_calls' && !calls.length) throw new AgentError('도구 호출 내용이 없습니다.');
    // Preserve provider-specific reasoning/signature fields for the next turn.
    history.push(message); pending = calls;
    return { text: text(message.content), calls };
  } };
}
export async function listFactchatModels(env: NodeJS.ProcessEnv, transport: Transport = fetch) {
  const { key, baseUrl } = factchatCredentials(env);
  try {
    const response = await transport(factchatEndpoint(baseUrl, 'models') + '?type=llm', {
      method: 'GET', headers: { Authorization: `Bearer ${key}` }, redirect: 'error', signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) { await response.body?.cancel(); throw new AgentError(`모델 조회 HTTP ${response.status}. 학교 키와 접근 권한을 확인하세요.`); }
    const data = object(await response.json());
    if (!Array.isArray(data.data)) throw new AgentError('모델 목록 응답 형식을 확인하세요.');
    return array(data.data).map(x => object(x)).filter(x => typeof x.id === 'string').map(x => ({ id: text(x.id), provider: text(x.owned_by), type: text(x.type) }));
  } catch (e) {
    if (e instanceof AgentError) throw e;
    throw new AgentError('학교 모델 목록을 조회하지 못했습니다. 연결 상태를 확인하세요.');
  }
}
