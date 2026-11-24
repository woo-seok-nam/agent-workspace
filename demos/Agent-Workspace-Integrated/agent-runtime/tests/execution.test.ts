import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executeDraft, type StepCall } from '../src/execution/run.js';
import { DEMO_REQUEST, sampleDraft } from '../src/generator/demo.js';
const saved = () => ({ outcome: 'draft', request: DEMO_REQUEST, response: sampleDraft() });
const inputs = { proposals: '원본 A: 짧은 개발 기간. B: 높은 사용자 가치. C: 차별 기능.', requirements: '첨부 자료만 사용' };
function model(verdict: 'pass' | 'needs_revision' = 'pass', check?: (p: any) => void): StepCall {
  return async raw => {
    const p = JSON.parse(raw); check?.(p);
    const review = p.task.kind === 'final_review';
    return JSON.stringify({ outputs: Object.fromEntries(p.output_ports.map((x: any) => [x.name, '단계 결과'])), verdict: review ? verdict : null, issues: review && verdict === 'needs_revision' ? ['근거 부족'] : [] });
  };
}
const signal = () => new AbortController().signal;
test('텍스트 그래프 실행 및 최종 검토에 원본 직접 전달', async () => {
  let seen = false;
  const r = await executeDraft(saved(), inputs, model('pass', p => {
    if (p.task.kind === 'final_review') { seen = true; assert.equal(p.inputs.source, inputs.proposals); assert.equal(p.inputs.data, '단계 결과'); }
  }), signal());
  assert.equal(r.status, 'completed'); assert.equal(r.steps.length, 5); assert.ok(seen); assert.equal(r.output.report, '단계 결과');
});
test('검토 수정 필요는 완료 출력 없이 중단', async () => {
  const r = await executeDraft(saved(), inputs, model('needs_revision'), signal());
  assert.equal(r.status, 'needs_review'); assert.deepEqual(r.output, {}); assert.equal(r.steps.at(-1)?.verdict, 'needs_revision');
});
test('입력 누락은 호출 전에 차단', async () => {
  let calls = 0;
  const r = await executeDraft(saved(), {}, async () => { calls++; return ''; }, signal());
  assert.equal(r.error, 'MISSING_INPUT'); assert.equal(calls, 0);
});
test('미지원 파일 포트 및 도구는 호출 전에 차단', async () => {
  const a = saved();
  a.response.workflow!.nodes[1]!.output_ports[0]!.type = 'file_ref';
  a.response.workflow!.nodes[2]!.input_ports[0]!.type = 'file_ref';
  let calls = 0; const call: StepCall = async () => { calls++; return ''; };
  assert.equal((await executeDraft(a, inputs, call, signal())).error, 'TEXT_PORTS_ONLY');
  const b = saved(); b.request = structuredClone(DEMO_REQUEST);
  b.request.tools.push({ id: 'read', description: 'read', capabilities: ['file_read'] });
  b.response.workflow!.nodes[1]!.task!.required_tools.push('read');
  assert.equal((await executeDraft(b, inputs, call, signal())).error, 'TOOLS_NOT_SUPPORTED');
  assert.equal(calls, 0);
});
test('잘못된 모델 JSON은 실패하고 원문 오류를 저장하지 않음', async () => {
  const r = await executeDraft(saved(), inputs, async () => 'secret-invalid', signal());
  assert.equal(r.status, 'failed'); assert.equal(r.error, 'MODEL_INVALID_JSON'); assert.ok(!JSON.stringify(r).includes('secret-invalid'));
});
test('필수 출력 포트 누락 차단', async () => {
  const r = await executeDraft(saved(), inputs, async () => JSON.stringify({ outputs: {}, verdict: null, issues: [] }), signal());
  assert.equal(r.status, 'failed'); assert.equal(r.steps.length, 0);
});
test('취소 후 다음 작업 호출 없음', async () => {
  const abort = new AbortController(); let calls = 0;
  const r = await executeDraft(saved(), inputs, async raw => { calls++; abort.abort(); return model()(raw, abort.signal); }, abort.signal);
  assert.equal(r.status, 'cancelled'); assert.equal(calls, 1); assert.deepEqual(r.output, {});
});
test('문맥 한도 초과 시 자르거나 원본을 생략하지 않음', async () => {
  let calls = 0;
  const r = await executeDraft(saved(), { ...inputs, proposals: '가'.repeat(11000) }, async () => { calls++; return ''; }, signal());
  assert.equal(r.error, 'CONTEXT_LIMIT'); assert.equal(calls, 0);
});
test('초안이 아닌 응답은 실행하지 않음', async () => {
  const a = saved(); a.outcome = 'needs_clarification';
  const r = await executeDraft(a, inputs, model(), signal()); assert.equal(r.status, 'failed'); assert.equal(r.steps.length, 0);
});

test('HTTP 오류와 실패 Node를 구분하고 공급자 원문은 노출하지 않음', async () => {
  const { AgentError } = await import('../src/types.js');
  const r = await executeDraft(saved(), inputs, async () => { throw new AgentError('API HTTP 401: secret-key'); }, signal());
  assert.equal(r.error, 'API_HTTP_401'); assert.equal(r.diagnostic?.node_id, 'summarize');
  assert.equal(r.diagnostic?.phase, 'model_call'); assert.ok(!JSON.stringify(r).includes('secret-key'));
});
test('단일 JSON 코드블록 응답은 파싱하고 일반 설명문은 거부', async () => {
  const r = await executeDraft(saved(), inputs, async (raw, sig) => '```json\n' + await model()(raw, sig) + '\n```', signal());
  assert.equal(r.status, 'completed');
  const bad = await executeDraft(saved(), inputs, async (raw, sig) => '설명\n' + await model()(raw, sig), signal());
  assert.equal(bad.error, 'MODEL_INVALID_JSON');
});
test('출력 계약 오류는 JSON 구문 오류와 별도로 기록', async () => {
  const r = await executeDraft(saved(), inputs, async () => JSON.stringify({ outputs: { result: { text: '잘못된 객체' } }, verdict: null, issues: [] }), signal());
  assert.equal(r.error, 'MODEL_OUTPUT_SCHEMA_INVALID');
  assert.ok(r.diagnostic?.fields.includes('outputs.result: invalid_type'));
});

test('일반 작업 verdict는 생략·문자열·객체여도 판정에 쓰지 않고 null로 정규화', async () => {
  for (const value of [undefined, 'pass', 'null', { status: 'done' }]) {
    const r = await executeDraft(saved(), inputs, async (raw, sig) => {
      const answer = JSON.parse(await model()(raw, sig));
      if (JSON.parse(raw).task.kind !== 'final_review') {
        if (value === undefined) delete answer.verdict; else answer.verdict = value;
      }
      return JSON.stringify(answer);
    }, signal());
    assert.equal(r.status, 'completed');
    assert.ok(r.steps.slice(0, -1).every(s => s.verdict === null));
  }
});
test('최종 검토 verdict 누락·null·잘못된 문자열은 계속 차단', async () => {
  for (const value of [undefined, null, 'done']) {
    const r = await executeDraft(saved(), inputs, async (raw, sig) => {
      const answer = JSON.parse(await model()(raw, sig));
      if (JSON.parse(raw).task.kind === 'final_review') {
        if (value === undefined) delete answer.verdict; else answer.verdict = value;
      }
      return JSON.stringify(answer);
    }, signal());
    assert.equal(r.status, 'failed'); assert.equal(r.error, 'MODEL_OUTPUT_SCHEMA_INVALID');
    assert.equal(r.diagnostic?.node_id, 'review'); assert.deepEqual(r.output, {});
  }
});

test('검토 의견·원본·이전 초안으로 작성만 수정하고 재검토 통과', async () => {
  let reviews = 0; let revisions = 0;
  const r = await executeDraft(saved(), inputs, async (raw, sig) => {
    const p = JSON.parse(raw), answer = JSON.parse(await model()(raw, sig));
    if (p.revision) {
      revisions++;
      assert.equal(p.revision.original_inputs.proposals, inputs.proposals);
      assert.equal(p.revision.previous_outputs.result, '단계 결과');
      assert.deepEqual(p.revision.issues, ['누락된 B 특성을 반영']);
      assert.deepEqual(p.inputs, {}); // 원본·초안을 전달하며 낡은 요약을 중복 전송하지 않음
      answer.outputs.result = '수정된 보고서';
    }
    if (p.task.kind === 'final_review') {
      reviews++;
      if (reviews === 1) { answer.verdict = 'needs_revision'; answer.issues = ['누락된 B 특성을 반영']; }
      else { assert.equal(p.inputs.data, '수정된 보고서'); answer.outputs.result = '최종 보고서'; }
    }
    return JSON.stringify(answer);
  }, signal());
  assert.equal(r.status, 'completed'); assert.equal(r.revisions, 1); assert.equal(revisions, 1);
  assert.deepEqual(r.steps.map(s => s.node_id), ['summarize','compare','recommend','write','review','write','review']);
  assert.equal(r.steps[5]!.attempt, 2); assert.equal(r.output.report, '최종 보고서');
});
test('계속 수정 필요면 기본 2회에서 중단하고 모든 시도 보존', async () => {
  const r = await executeDraft(saved(), inputs, model('needs_revision'), signal());
  assert.equal(r.revisions, 2); assert.equal(r.steps.length, 9); assert.equal(r.status, 'needs_review');
  assert.deepEqual(r.steps.filter(s => s.node_id === 'review').map(s => s.attempt), [1,2,3]);
  assert.deepEqual(r.output, {});
});
test('수정 0회 옵션으로 기존 보류 동작 유지', async () => {
  const r = await executeDraft(saved(), inputs, model('needs_revision'), signal(), { maxRevisions: 0 });
  assert.equal(r.revisions, 0); assert.equal(r.steps.length, 5); assert.equal(r.status, 'needs_review');
});
test('수정 중 취소와 모델 실패는 보류·완료로 덮지 않음', async () => {
  for (const cancel of [true, false]) {
    const abort = new AbortController();
    const r = await executeDraft(saved(), inputs, async (raw, sig) => {
      if (JSON.parse(raw).revision) { if (cancel) abort.abort(); throw new Error('private'); }
      return model('needs_revision')(raw, sig);
    }, abort.signal);
    assert.equal(r.status, cancel ? 'cancelled' : 'failed'); assert.equal(r.steps.length, 5);
    assert.deepEqual(r.output, {}); assert.ok(!JSON.stringify(r).includes('private'));
  }
});
test('잘못된 수정 한도는 호출 전에 거부', async () => {
  let calls = 0;
  for (const maxRevisions of [-1, 4, 1.5, NaN]) {
    const r = await executeDraft(saved(), inputs, async () => { calls++; return ''; }, signal(), { maxRevisions });
    assert.equal(r.status, 'failed');
  }
  assert.equal(calls, 0);
});
