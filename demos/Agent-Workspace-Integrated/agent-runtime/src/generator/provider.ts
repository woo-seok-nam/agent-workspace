import { resolveSettings, factchatEndpoint } from '../providers/config.js';
import { AgentError } from '../types.js';
import { array, object, text, type Transport } from '../providers/http.js';
import { responseJsonSchema } from './schema.js';
export interface Usage { input_tokens: number; output_tokens: number; total_tokens: number }
export interface ProviderReply { value: unknown; usage: Usage | null; response_id: string | null }
export interface GenerationProvider {
  readonly model: string;
  readonly mode: 'live' | 'demo' | 'test';
  generate(input: { system: string; context: string; maxOutputTokens: number; signal: AbortSignal }): Promise<ProviderReply>;
}
export class GenerationError extends Error {
  constructor(readonly code: string, message: string, readonly retryable = false, readonly usage: Usage | null = null) { super(message); }
}
function usageOf(value: unknown): Usage | null {
  const v = object(value);
  const nums = [v.input_tokens, v.output_tokens, v.total_tokens];
  return nums.every(x => typeof x === 'number' && Number.isSafeInteger(x) && x >= 0)
    ? { input_tokens: nums[0] as number, output_tokens: nums[1] as number, total_tokens: nums[2] as number } : null;
}
async function readBounded(response: Response, signal: AbortSignal): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new GenerationError('API_RESPONSE_INVALID', 'API 응답 본문이 없습니다.');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      signal.throwIfAborted();
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 1_000_000) throw new GenerationError('RESPONSE_TOO_LARGE', 'API 응답 크기 한도를 초과했습니다.');
      chunks.push(part.value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (e) {
    await reader.cancel().catch(() => {});
    if (e instanceof GenerationError) throw e;
    throw new GenerationError('API_RESPONSE_INVALID', 'API 응답 형식을 확인하세요.');
  } finally { reader.releaseLock(); }
}
export function createOpenAIProvider(settings: { key: string; model: string; gatewayBaseUrl?: string }, transport: Transport = fetch): GenerationProvider {
  if (!settings.key.trim() || !settings.model.trim()) throw new GenerationError('CONFIG_MISSING', 'OPENAI_API_KEY와 WORKFLOW_MODEL 또는 OPENAI_MODEL을 .env에 입력하세요.');
  const gateway = settings.gatewayBaseUrl !== undefined;
  const endpoint = gateway ? factchatEndpoint(settings.gatewayBaseUrl!, 'chat/completions') : 'https://api.openai.com/v1/responses';
  return {
    model: settings.model, mode: 'live',
    async generate(input) {
      const timeout = AbortSignal.timeout(60_000);
      const signal = AbortSignal.any([input.signal, timeout]);
      try {
        signal.throwIfAborted();
        const response = await transport(endpoint, {
          method: 'POST', redirect: 'error', signal,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.key}` },
          body: JSON.stringify(gateway ? {
            model: settings.model, stream: false, max_tokens: input.maxOutputTokens,
            messages: [{ role: 'system', content: input.system }, { role: 'user', content: input.context }],
            response_format: { type: 'json_schema', json_schema: { name: 'workflow_draft', strict: true, schema: responseJsonSchema() } },
          } : { model: settings.model, store: false, instructions: input.system, input: input.context,
            max_output_tokens: input.maxOutputTokens,
            text: { format: { type: 'json_schema', name: 'workflow_draft', strict: true, schema: responseJsonSchema() } },
          }),
        });
        if (!response.ok) {
          await response.body?.cancel();
          const retryable = [408, 429, 500, 502, 503, 504].includes(response.status);
          throw new GenerationError(`HTTP_${response.status}`, `API HTTP ${response.status}. 모델 ID·권한·사용 한도를 확인하세요.`, retryable);
        }
        const data = object(await readBounded(response, signal));
        const rawUsage = object(data.usage);
        const usage = usageOf(gateway ? { input_tokens: rawUsage.prompt_tokens, output_tokens: rawUsage.completion_tokens, total_tokens: rawUsage.total_tokens } : data.usage);
        if (gateway) {
          const choice = object(array(data.choices)[0]), message = object(choice.message);
          if (message.refusal) throw new GenerationError('MODEL_REFUSAL', '학교 AI 모델이 생성을 거절했습니다.', false, usage);
          if (choice.finish_reason !== 'stop') throw new GenerationError('INCOMPLETE_RESPONSE', '학교 AI 출력이 완료되지 않았습니다. 출력 한도와 모델 지원 기능을 확인하세요.', false, usage);
          if (array(message.tool_calls).length) throw new GenerationError('API_RESPONSE_INVALID', '계획 생성 중 예상하지 않은 도구 호출이 반환되었습니다.', false, usage);
          const answer = text(message.content);
          if (!answer.trim()) throw new GenerationError('EMPTY_RESPONSE', '학교 AI 텍스트 출력이 없습니다.', false, usage);
          let value: unknown;
          try { value = JSON.parse(answer); } catch { value = answer; }
          return { value, usage, response_id: typeof data.id === 'string' ? data.id : null };
        }
        const content = array(data.output).filter(x => object(x).type === 'message').flatMap(x => array(object(x).content));
        if (content.some(x => object(x).type === 'refusal')) throw new GenerationError('MODEL_REFUSAL', '모델이 요청에 대한 생성을 거절했습니다.', false, usage);
        if (data.status !== 'completed') throw new GenerationError('INCOMPLETE_RESPONSE', '출력이 완료되지 않았습니다. 모델의 출력 한도와 응답 상태를 확인하세요.', false, usage);
        const answer = content.filter(x => object(x).type === 'output_text').map(x => text(object(x).text)).join('');
        if (!answer.trim()) throw new GenerationError('EMPTY_RESPONSE', '모델의 텍스트 출력이 없습니다.', false, usage);
        let value: unknown;
        try { value = JSON.parse(answer); } catch { value = answer; } // Invalid model JSON is handled by the repair loop, not an API retry.
        return { value, usage, response_id: typeof data.id === 'string' ? data.id : null };
      } catch (e) {
        if (input.signal.aborted) throw new GenerationError('CANCELLED', '생성 요청이 중단되었습니다.');
        if (timeout.aborted) throw new GenerationError('API_TIMEOUT', '개별 API 요청의 60초 제한을 초과했습니다.', true);
        if (e instanceof GenerationError) throw e;
        throw new GenerationError('NETWORK_ERROR', 'API 연결에 실패했습니다.', true);
      }
    },
  };
}

// Workflow model selection is independent of the execution-role model settings.
export function createGenerationProvider(env: NodeJS.ProcessEnv, transport: Transport = fetch): GenerationProvider {
  try {
    const settings = resolveSettings(env.WORKFLOW_PROVIDER?.trim() || 'openai', env, env.WORKFLOW_MODEL);
    if (settings.backend === 'factchat') return createOpenAIProvider({ key: settings.key, model: settings.model, gatewayBaseUrl: settings.baseUrl }, transport);
    if (settings.provider !== 'openai') throw new GenerationError('CONFIG_UNSUPPORTED', 'Gemini/Claude Workflow 생성은 AI_BACKEND=factchat을 사용하세요.');
    return createOpenAIProvider(settings, transport);
  } catch (e) {
    if (e instanceof GenerationError) throw e;
    throw new GenerationError('CONFIG_INVALID', e instanceof AgentError ? e.message : '모델 연결 설정을 확인하세요.');
  }
}
