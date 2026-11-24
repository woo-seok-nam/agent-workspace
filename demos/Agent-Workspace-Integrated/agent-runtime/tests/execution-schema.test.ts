import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepResponseSchema } from '../src/execution/schema.js';
import { executeDraft } from '../src/execution/run.js';
import { sampleDraft, DEMO_REQUEST } from '../src/generator/demo.js';
import { runModel } from '../src/run.js';
const schema = stepResponseSchema([{ name: 'report', required: true }, { name: 'note', required: false }], true);
test('작업마다 포트 이름과 검토 상태를 API 스키마로 전달', async () => {
  let calls = 0;
  const result = await executeDraft({ outcome: 'draft', request: DEMO_REQUEST, response: sampleDraft() }, { proposals: 'A/B/C 자료', requirements: '첨부만 사용' }, async (raw, signal, wire) => {
    calls++;
    const p = JSON.parse(raw), review = p.task.kind === 'final_review';
    assert.deepEqual(wire, stepResponseSchema(p.output_ports, review));
    const properties = (wire as any).properties;
    assert.deepEqual(properties.outputs.required, p.output_ports.map((x: any) => x.name));
    assert.equal(properties.outputs.additionalProperties, false);
    assert.deepEqual(properties.verdict, review ? { type: 'string', enum: ['pass','needs_revision'] } : { type: 'null' });
    return JSON.stringify({ outputs: Object.fromEntries(p.output_ports.map((x: any) => [x.name, '결과'])), verdict: review ? 'pass' : null, issues: [] });
  }, new AbortController().signal);
  assert.equal(result.status, 'completed'); assert.equal(calls, 5);
});
for (const provider of ['openai', 'gemini', 'claude']) test(`${provider} 학교 Gateway 요청에 strict JSON schema 포함`, async () => {
  const result = await runModel(provider, '작업', { AI_BACKEND: 'factchat', FACTCHAT_API_KEY: 'secret', [`${provider.toUpperCase()}_MODEL`]: 'test-model' }, async (url, init) => {
    assert.match(String(url), /gateway\/chat\/completions\/$/);
    const body = JSON.parse(String(init?.body));
    assert.deepEqual(body.response_format, { type: 'json_schema', json_schema: { name: 'workflow_step', strict: true, schema } });
    return Response.json({ choices: [{ finish_reason: 'stop', message: { content: '{}' } }] });
  }, { responseSchema: schema });
  assert.equal(result.text, '{}');
});
test('OpenAI 본사 Responses API 형식에 맞춰 schema 전달', async () => {
  await runModel('openai', '작업', { AI_BACKEND: 'direct', OPENAI_API_KEY: 'secret', OPENAI_MODEL: 'test' }, async (url, init) => {
    assert.equal(String(url), 'https://api.openai.com/v1/responses');
    const body = JSON.parse(String(init?.body));
    assert.deepEqual(body.text.format, { type: 'json_schema', name: 'workflow_step', strict: true, schema });
    return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: '{}' }] }] });
  }, { responseSchema: schema });
});
test('스키마 미지원 모델의 HTTP 400을 일반 출력으로 자동 재시도하지 않음', async () => {
  let calls = 0;
  await assert.rejects(runModel('openai', '작업', { AI_BACKEND: 'factchat', FACTCHAT_API_KEY: 'secret', OPENAI_MODEL: 'test' }, async () => { calls++; return new Response('', { status: 400 }); }, { responseSchema: schema }), /HTTP 400/);
  assert.equal(calls, 1);
});
test('본사 Gemini 구조화 실행은 호출 전에 명시적으로 차단', async () => {
  let calls = 0;
  await assert.rejects(runModel('gemini', '작업', { AI_BACKEND: 'direct', GEMINI_API_KEY: 'secret', GEMINI_MODEL: 'test' }, async () => { calls++; return Response.json({}); }, { responseSchema: schema }), /구조화 실행/);
  assert.equal(calls, 0);
});
