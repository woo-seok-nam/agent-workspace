import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runModel } from '../src/run.js';
import { runAgent } from '../src/agent-runner.js';
import { createToolSession } from '../src/providers/tool-session.js';
import { runToolLoop } from '../src/tool-loop.js';
import { factchatEndpoint, backend, resolveSettings, PROVIDERS, DEFAULT_FACTCHAT_URL } from '../src/providers/config.js';
import { listFactchatModels } from '../src/providers/factchat.js';
import { createGenerationProvider } from '../src/generator/provider.js';
import { generateWorkflow } from '../src/generator/generate.js';
import { DEMO_REQUEST, sampleDraft } from '../src/generator/demo.js';
import { responseJsonSchema } from '../src/generator/schema.js';
import { WorkflowSchema } from '../src/workflow/schema.js';
import { assertWorkflowConfig, liveExecutor } from '../src/workflow/executors.js';
import { runWorkflow } from '../src/workflow/runner.js';
import { SqliteWorkflowStore } from '../src/workflow/sqlite-store.js';
import { createService } from '../src/ipc/service.js';
import type { Message } from '../src/ipc/protocol.js';
import type { Transport } from '../src/providers/http.js';
const env = { AI_BACKEND: 'factchat', FACTCHAT_API_KEY: 'school-secret', FACTCHAT_BASE_URL: DEFAULT_FACTCHAT_URL, OPENAI_MODEL: 'school-gpt', GEMINI_MODEL: 'school-gemini', CLAUDE_MODEL: 'school-claude' };
const completion = (content = '답변') => ({ id: 'chat-test', choices: [{ finish_reason: 'stop', message: { role: 'assistant', content } }], usage: { prompt_tokens: 11, completion_tokens: 22, total_tokens: 33 } });
for (const provider of PROVIDERS) {
  test(`${provider}: 학교 키 하나로 채팅과 Agent 호출, 본사 주소 미사용`, async () => {
    let calls = 0;
    const transport: Transport = async (url, init) => {
      calls++;
      assert.equal(String(url), DEFAULT_FACTCHAT_URL + '/chat/completions/');
      assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer school-secret');
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, resolveSettings(provider, env).model);
      assert.equal(body.messages[0].role, 'system'); assert.equal(body.messages[1].content, '작업');
      assert.equal(init?.redirect, 'error'); assert.ok(init?.signal);
      assert.equal(body.max_tokens, 16384); assert.ok(!String(init?.body).includes('school-secret'));
      return Response.json(completion());
    };
    const answer = await runModel(provider, '작업', env, transport);
    assert.equal(answer.provider, provider); assert.equal(answer.text, '답변');
    assert.equal((await runAgent(provider, 'writer', '작업', { env, transport })).status, 'Completed');
    assert.equal(calls, 2);
  });
  test(`${provider}: 학교 Gateway 도구 왕복과 원본 응답 필드 보존`, async () => {
    let calls = 0;
    const transport: Transport = async (url, init) => {
      calls++;
      assert.equal(String(url), DEFAULT_FACTCHAT_URL + '/chat/completions/');
      const body = JSON.parse(String(init?.body));
      assert.equal(body.tools[0].type, 'function'); assert.equal(body.tools[0].function.name, 'text_stats');
      if (calls === 1) return Response.json({ choices: [{ finish_reason: 'tool_calls', message: {
        role: 'assistant', content: null, reasoning_content: 'opaque-carried-only',
        tool_calls: [{ id: 'call-1', type: 'function', function: { name: 'text_stats', arguments: '{"text":"안녕 세상"}' } }],
      } }] });
      assert.equal(body.messages[2].reasoning_content, 'opaque-carried-only');
      assert.equal(body.messages[3].role, 'tool'); assert.equal(body.messages[3].tool_call_id, 'call-1');
      assert.equal(JSON.parse(body.messages[3].content).data.characters, 5);
      return Response.json(completion('5글자'));
    };
    const result = await runToolLoop(createToolSession(provider, '작업', '지시', env, transport));
    assert.equal(result.status, 'Completed'); assert.equal(calls, 2);
    assert.equal(result.tools[0]?.ok, true); assert.ok(!JSON.stringify(result).includes('opaque-carried-only'));
  });
  test(`${provider}: Workflow 생성 모델 선택과 strict Schema·사용량 정규화`, async () => {
    const p = createGenerationProvider({ ...env, WORKFLOW_PROVIDER: provider }, async (url, init) => {
      assert.equal(String(url), DEFAULT_FACTCHAT_URL + '/chat/completions/');
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, resolveSettings(provider, env).model);
      assert.equal(body.response_format.json_schema.strict, true);
      assert.deepEqual(body.response_format.json_schema.schema, responseJsonSchema());
      assert.equal(body.instructions, undefined); assert.equal(body.text, undefined);
      return Response.json(completion(JSON.stringify(sampleDraft())));
    });
    const result = await generateWorkflow(DEMO_REQUEST, p);
    assert.equal(result.outcome, 'draft'); assert.equal(result.stats.usage.total_tokens, 33);
    assert.equal(result.stats.usage.input_tokens, 11); assert.equal(result.stats.usage_complete, true);
  });
}
test('학교 설정 누락·오타는 본사 API로 자동 대체하지 않음', async () => {
  let calls = 0; const transport: Transport = async () => { calls++; throw new Error(); };
  await assert.rejects(runModel('claude', '작업', { ...env, FACTCHAT_API_KEY: '' }, transport), /FACTCHAT_API_KEY/);
  await assert.rejects(runModel('openai', '작업', { ...env, FACTCHAT_API_KEY: '', OPENAI_API_KEY: 'direct' }, transport), /FACTCHAT_API_KEY/);
  await assert.rejects(runModel('claude', '작업', { ...env, AI_BACKEND: 'direct' }, transport), /학교 Gateway/);
  assert.throws(() => backend({ AI_BACKEND: 'typo' }), /AI_BACKEND/);
  assert.equal(calls, 0);
});
test('기본 주소·끝 슬래시 정규화와 잘못된 주소 차단', () => {
  assert.equal(factchatEndpoint(DEFAULT_FACTCHAT_URL + '/', 'models'), DEFAULT_FACTCHAT_URL + '/models/');
  for (const base of ['http://example.com/v1/gateway', 'https://dcu-ac.factchat.bot/dashboard/chat/40882', DEFAULT_FACTCHAT_URL + '?token=x', 'https://key@example.com/v1/gateway', DEFAULT_FACTCHAT_URL + '#x'])
    assert.throws(() => factchatEndpoint(base, 'models'), /Gateway/);
  assert.equal(backend({ FACTCHAT_API_KEY: 'x' }), 'factchat');
  assert.equal(backend({}), 'direct');
});
test('명시적 WORKFLOW_MODEL 우선, direct 생성기 제한', () => {
  assert.equal(createGenerationProvider({ ...env, WORKFLOW_PROVIDER: 'claude', WORKFLOW_MODEL: 'chosen' }).model, 'chosen');
  assert.throws(() => createGenerationProvider({ ...env, WORKFLOW_PROVIDER: 'bad' }), /공급자/);
  assert.throws(() => createGenerationProvider({ AI_BACKEND: 'direct', WORKFLOW_PROVIDER: 'gemini', GEMINI_API_KEY: 'x', GEMINI_MODEL: 'm' }), /factchat/);
});
test('학교 응답 length·refusal·빈 텍스트·비정상 도구 호출 차단', async () => {
  for (const payload of [
    { choices: [{ finish_reason: 'length', message: { content: '미완료' } }] },
    { choices: [{ finish_reason: 'stop', message: { content: '내용', refusal: '거절' } }] },
    completion(''),
    { choices: [{ finish_reason: 'stop', message: { content: '도구', tool_calls: [{}] } }] },
  ]) await assert.rejects(runModel('claude', '작업', env, async () => Response.json(payload)));
});
test('학교 JSON 생성 거절과 잘림은 보정 없이 실패, 400은 자동 형식 강등 안 함', async () => {
  for (const [payload, code] of [
    [{ choices: [{ finish_reason: 'stop', message: { refusal: 'SECRET' } }] }, 'MODEL_REFUSAL'],
    [{ choices: [{ finish_reason: 'length', message: { content: '{}' } }] }, 'INCOMPLETE_RESPONSE'],
    [completion(''), 'EMPTY_RESPONSE'],
  ] as const) {
    const result = await generateWorkflow(DEMO_REQUEST, createGenerationProvider(env, async () => Response.json(payload)));
    assert.equal(result.error?.code, code); assert.equal(result.stats.model_calls, 1); assert.equal(result.stats.repairs, 0);
  }
  const result = await generateWorkflow(DEMO_REQUEST, createGenerationProvider(env, async () => new Response('RAW-SECRET', { status: 400 })));
  assert.equal(result.error?.code, 'HTTP_400'); assert.equal(result.stats.model_calls, 1);
  assert.ok(!JSON.stringify(result).includes('RAW-SECRET'));
});
test('학교 모델 목록은 정확한 GET 경로·인증을 사용하고 메타데이터만 반환', async () => {
  const result = await listFactchatModels(env, async (url, init) => {
    assert.equal(String(url), DEFAULT_FACTCHAT_URL + '/models/?type=llm'); assert.equal(init?.method, 'GET');
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer school-secret');
    return Response.json({ data: [{ id: 'actual-id', owned_by: 'claude', type: 'llm', private_field: 'hidden' }] });
  });
  assert.deepEqual(result, [{ id: 'actual-id', provider: 'claude', type: 'llm' }]);
  await assert.rejects(listFactchatModels(env, async () => new Response('SECRET', { status: 401 })), e => e instanceof Error && e.message.includes('401') && !e.message.includes('SECRET'));
});
test('Claude 포함 Workflow 실행·SQLite 저장·재조회', async t => {
  const workflow = WorkflowSchema.parse({ schemaVersion: 1, id: 'school', name: '학교 AI', steps: [
    { id: 'plan', agent: 'planner', provider: 'openai' }, { id: 'draft', agent: 'writer', provider: 'claude' }, { id: 'review', agent: 'reviewer', provider: 'gemini' },
  ] });
  assertWorkflowConfig(workflow, env);
  const store = new SqliteWorkflowStore(':memory:'); t.after(() => store.close());
  const models: string[] = [];
  const run = await runWorkflow(workflow, '목표', liveExecutor({ env, transport: async (_u, init) => {
    models.push(JSON.parse(String(init?.body)).model); return Response.json(completion());
  } }), undefined, { store, mode: 'live' });
  assert.equal(run.status, 'Completed'); assert.deepEqual(models, ['school-gpt', 'school-claude', 'school-gemini']);
  assert.equal(store.get(run.runId)?.steps[1]?.provider, 'claude');
  assert.ok(!JSON.stringify(store.get(run.runId)).includes('school-secret'));
});
test('Sidecar 계약도 claude를 허용', async t => {
  const store = new SqliteWorkflowStore(':memory:'); t.after(() => store.close());
  const messages: Message[] = [];
  await createService(store, m => messages.push(m))(JSON.stringify({ protocolVersion: 1, requestId: 'claude-demo', method: 'run.start', params: {
    mode: 'demo', goal: '목표', workflow: { schemaVersion: 1, id: 'claude', name: 'Claude', steps: [{ id: 'review', agent: 'reviewer', provider: 'claude' }] },
  } }));
  const last = messages.at(-1); assert.ok(last?.type === 'response' && last.ok);
  assert.equal(store.list()[0]?.status, 'Completed');
});
test('학교 API 취소 신호가 전달되며 중단 후 추가 호출 안 함', async () => {
  const controller = new AbortController(); controller.abort(); let calls = 0;
  const transport: Transport = async () => { calls++; return Response.json(completion()); };
  await assert.rejects(runModel('claude', '작업', env, transport, { signal: controller.signal }), /취소/);
  const loop = await runToolLoop(createToolSession('claude', '작업', '지시', env, transport, controller.signal));
  assert.equal(loop.status, 'Failed'); assert.equal(calls, 0);
});
