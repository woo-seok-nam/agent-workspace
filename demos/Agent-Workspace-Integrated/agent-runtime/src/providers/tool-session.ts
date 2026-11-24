import { providerId, resolveSettings } from './config.js';
import { factchatToolSession } from './factchat.js';
import { AgentError } from '../types.js';
import type { ToolSession } from '../tool-loop.js';
import { toolDefinitions, type ToolCall } from '../tools/registry.js';
import { array, object, post, text, type Transport } from './http.js';

// 원본 공급자 응답은 실행별 세션 내부에만 보존합니다. Gemini 서명과 OpenAI reasoning 항목도 재전달합니다.
export function createToolSession(provider: string, prompt: string, system: string, env: NodeJS.ProcessEnv = process.env, transport: Transport = fetch, signal?: AbortSignal): ToolSession {
  providerId(provider);
  if (!prompt.trim() || prompt.length > 10_000) throw new AgentError('요청은 비어 있지 않은 UTF-16 10,000 이하 문자열이어야 합니다.');
  const settings = resolveSettings(provider, env);
  if (settings.backend === 'factchat') return factchatToolSession(settings, prompt, system, transport, signal);
  const { key, model } = settings;
  let pending: ToolCall[] = [];
  let round = 0;
  const history: unknown[] = provider === 'openai' ? [{ role: 'user', content: prompt }] : [{ role: 'user', parts: [{ text: prompt }] }];
  let providerIds = new Map<string, string>();
  return { async next(results) {
    if (results.length !== pending.length || results.some((r, i) => r.id !== pending[i]?.id || r.name !== pending[i]?.name))
      throw new AgentError('도구 호출과 결과의 연결이 일치하지 않습니다.');
    if (results.length) {
      if (provider === 'openai') history.push(...results.map(r => ({ type: 'function_call_output', call_id: r.id, output: JSON.stringify(r.ok ? { ok: true, data: r.data } : { ok: false, code: r.code }) })));
      else history.push({ role: 'user', parts: results.map(r => ({ functionResponse: {
        name: r.name, ...(providerIds.has(r.id) ? { id: providerIds.get(r.id) } : {}),
        response: r.ok ? { result: r.data } : { error: r.code },
      } })) });
    }
    round++;
    if (provider === 'openai') {
      const data = await post('https://api.openai.com/v1/responses', { Authorization: `Bearer ${key}` }, {
        model, instructions: system, input: history, store: false, include: ['reasoning.encrypted_content'],
        max_output_tokens: 4096, parallel_tool_calls: false,
        tools: toolDefinitions.map(t => ({ type: 'function', ...t, strict: true })),
      }, transport, signal);
      if (data.status !== 'completed') throw new AgentError('OpenAI 도구 요청이 정상 완료되지 않았습니다.');
      const output = array(data.output);
      const calls = output.filter(x => object(x).type === 'function_call').map(x => {
        const call = object(x); let args: unknown;
        try { args = JSON.parse(text(call.arguments)); } catch { throw new AgentError('도구 인수가 올바른 JSON이 아닙니다.'); }
        return { id: text(call.call_id), name: text(call.name), args };
      });
      const answer = output.filter(x => object(x).type === 'message').flatMap(x => array(object(x).content))
        .filter(x => object(x).type === 'output_text').map(x => text(object(x).text)).join('\n');
      history.push(...output); pending = calls;
      return { text: answer, calls };
    }
    const data = await post(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { 'x-goog-api-key': key }, {
      systemInstruction: { parts: [{ text: system }] }, contents: history,
      generationConfig: { maxOutputTokens: 4096 },
      tools: [{ functionDeclarations: toolDefinitions.map(t => ({ name: t.name, description: t.description, parametersJsonSchema: t.parameters })) }],
    }, transport, signal);
    const candidate = object(array(data.candidates)[0]);
    if (candidate.finishReason !== 'STOP') throw new AgentError('Gemini 도구 요청이 정상 완료되지 않았습니다.');
    const content = object(candidate.content), parts = array(content.parts);
    providerIds = new Map();
    const calls = parts.filter(p => object(p).functionCall !== undefined).map((p, i) => {
      const call = object(object(p).functionCall), originalId = text(call.id);
      const id = originalId || `gemini-${round}-${i}`;
      if (originalId) providerIds.set(id, originalId);
      return { id, name: text(call.name), args: call.args };
    });
    // thoughtSignature가 들어 있는 part를 재작성하거나 제거하지 않습니다.
    history.push(content); pending = calls;
    return { calls, text: parts.filter(p => object(p).thought !== true).map(p => text(object(p).text)).join('\n') };
  }};
}
